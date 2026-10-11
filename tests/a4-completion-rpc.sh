#!/usr/bin/env bash
set -euo pipefail

# Disposable PostgreSQL test only. It never connects to shared Supabase.
export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
export PGDATABASE="${PGDATABASE:-arkhe_a4_completion_test}"

LOG_FILE="$(mktemp)"
FIRST_LOG="$(mktemp)"
RACE_LOG="$(mktemp)"
LOCK_READY="$(mktemp)"
rm -f "$LOCK_READY"
export LOCK_READY
trap 'rm -f "$LOG_FILE" "$FIRST_LOG" "$RACE_LOG" "$LOCK_READY"' EXIT

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE service_role;
CREATE ROLE anon;
CREATE ROLE authenticated;

CREATE TABLE public.rondas_investigacion (
  id uuid primary key
);

CREATE TABLE public.convocatorias_ronda (
  id uuid primary key,
  ronda_id uuid not null,
  convocada_por uuid not null,
  investigador_id uuid not null,
  tipo_convocatoria text not null,
  foco_intervencion_id uuid,
  instruccion_humana text,
  estado text not null default 'pendiente',
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

CREATE TABLE public.intervenciones_ronda (
  id uuid primary key default gen_random_uuid(),
  ronda_id uuid not null,
  investigador_id uuid not null,
  orden integer not null,
  tipo text not null,
  contenido text not null,
  responde_a_intervencion_id uuid,
  nodo_id bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE UNIQUE INDEX intervenciones_ronda_orden_uk
  ON public.intervenciones_ronda (ronda_id, orden);

CREATE OR REPLACE FUNCTION public.arkhe_insert_intervencion_ronda(
  p_ronda_id uuid,
  p_investigador_id uuid,
  p_tipo text,
  p_contenido text,
  p_responde_a_intervencion_id uuid,
  p_nodo_id bigint,
  p_metadata jsonb
)
RETURNS public.intervenciones_ronda
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_orden integer;
  v_intervencion public.intervenciones_ronda;
BEGIN
  PERFORM 1
  FROM public.rondas_investigacion
  WHERE id = p_ronda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  SELECT COALESCE(MAX(orden), 0) + 1
    INTO v_orden
    FROM public.intervenciones_ronda
   WHERE ronda_id = p_ronda_id;

  INSERT INTO public.intervenciones_ronda (
    ronda_id, investigador_id, orden, tipo, contenido,
    responde_a_intervencion_id, nodo_id, metadata
  ) VALUES (
    p_ronda_id, p_investigador_id, v_orden, p_tipo, p_contenido,
    p_responde_a_intervencion_id, p_nodo_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_intervencion;

  RETURN v_intervencion;
END;
$$;

INSERT INTO public.rondas_investigacion (id)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

INSERT INTO public.convocatorias_ronda (
  id, ronda_id, convocada_por, investigador_id, tipo_convocatoria,
  estado, correlation_id
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'perspectiva', 'enviada',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
);
SQL

MIGRATION="supabase/migrations/20261011054000_complete_invocation_atomically.sql"
if [[ ! -f "$MIGRATION" ]]; then
  echo "FAIL: atomic completion migration not found: $MIGRATION" >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 -f "$MIGRATION"

DISPATCH_MIGRATION="supabase/migrations/20261011060000_create_core_dispatch_claims.sql"
if [[ ! -f "$DISPATCH_MIGRATION" ]]; then
  echo "FAIL: signed-dispatch claim migration not found: $DISPATCH_MIGRATION" >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 -f "$DISPATCH_MIGRATION"

# The dispatch receipt is a durable one-shot claim for a signed dispatch_id.
psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.core_dispatch_claims (dispatch_id, convocatoria_id, service_id)
VALUES ('99999999-9999-4999-8999-999999999999',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'atlas');"
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.core_dispatch_claims (dispatch_id, convocatoria_id, service_id)
VALUES ('99999999-9999-4999-8999-999999999999',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'atlas');" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a replayed dispatch_id was accepted twice." >&2
  exit 1
fi
if ! grep -q "duplicate key value" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: repeated dispatch was rejected for an unexpected reason." >&2
  exit 1
fi
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.core_dispatch_claims (dispatch_id, convocatoria_id, service_id)
VALUES ('77777777-7777-4777-8777-777777777777',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'atlas');" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a second dispatch ID was accepted for the same invocation." >&2
  exit 1
fi
if ! grep -q "duplicate key value" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: second dispatch for the same invocation was rejected for an unexpected reason." >&2
  exit 1
fi
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.core_dispatch_claims (dispatch_id, convocatoria_id, service_id)
VALUES ('88888888-8888-4888-8888-888888888888',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'not-a-service');" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: the dispatch ledger accepted an unknown service identity." >&2
  exit 1
fi

CALL="select public.arkhe_complete_invocation_atomically(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'perspectiva',
  'Respuesta de prueba idempotente',
  null::uuid,
  null::bigint,
  '{\"testing\":true}'::jsonb,
  repeat('a',64)
);"

FIRST_RESULT="$(psql -v ON_ERROR_STOP=1 -Atq -c "$CALL")"
if ! printf '%s' "$FIRST_RESULT" | grep -q '"idempotent_replay": false'; then
  printf '%s\n' "$FIRST_RESULT"
  echo "FAIL: first completion was not reported as a new write." >&2
  exit 1
fi

SECOND_RESULT="$(psql -v ON_ERROR_STOP=1 -Atq -c "$CALL")"
if ! printf '%s' "$SECOND_RESULT" | grep -q '"idempotent_replay": true'; then
  printf '%s\n' "$SECOND_RESULT"
  echo "FAIL: exact replay was not returned idempotently." >&2
  exit 1
fi

INTERVENTION_COUNT="$(psql -v ON_ERROR_STOP=1 -Atq -c "select count(*) from public.intervenciones_ronda where metadata ->> 'convocatoria_id'='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';")"
test "$INTERVENTION_COUNT" = "1"

# A completed invocation with a different fingerprint must conflict rather
# than silently treating new content as an exact replay.
if psql -v ON_ERROR_STOP=1 -c "select public.arkhe_complete_invocation_atomically(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'perspectiva',
  'Contenido diferente',
  null::uuid,
  null::bigint,
  '{\"testing\":true}'::jsonb,
  repeat('b',64)
);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a different payload was accepted for an already completed invocation." >&2
  exit 1
fi
if ! grep -q "different payload" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: the changed-payload retry was rejected for an unexpected reason." >&2
  exit 1
fi

# Concurrency test: one transaction completes and holds the invocation row
# lock; the second identical request waits and returns the original intervention.
psql -v ON_ERROR_STOP=1 -c "TRUNCATE public.core_dispatch_claims, public.intervenciones_ronda, public.convocatorias_ronda;"
psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.convocatorias_ronda (
  id,ronda_id,convocada_por,investigador_id,tipo_convocatoria,estado,correlation_id
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'perspectiva','enviada',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
);"
rm -f "$LOCK_READY"
psql -v ON_ERROR_STOP=1 >"$FIRST_LOG" 2>&1 <<'SQL' &
BEGIN;
SELECT public.arkhe_complete_invocation_atomically(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'perspectiva',
  'Respuesta de prueba idempotente',
  null::uuid,
  null::bigint,
  '{"testing":true}'::jsonb,
  repeat('a',64)
);
\! touch "$LOCK_READY"
SELECT pg_sleep(2);
COMMIT;
SQL
FIRST_PID=$!
LOCK_HELD=""
for _ in $(seq 1 50); do
  if [[ -f "$LOCK_READY" ]]; then LOCK_HELD=1; break; fi
  sleep 0.1
done
if [[ -z "$LOCK_HELD" ]]; then
  kill "$FIRST_PID" 2>/dev/null || true
  wait "$FIRST_PID" 2>/dev/null || true
  cat "$FIRST_LOG"
  echo "FAIL: first completion did not hold the transaction open." >&2
  exit 1
fi

if ! psql -v ON_ERROR_STOP=1 -Atq -c "$CALL" >"$RACE_LOG" 2>&1; then
  wait "$FIRST_PID" || true
  cat "$RACE_LOG"
  echo "FAIL: identical concurrent completion did not return successfully." >&2
  exit 1
fi
wait "$FIRST_PID"
if ! grep -q '"idempotent_replay": true' "$RACE_LOG"; then
  cat "$RACE_LOG"
  echo "FAIL: concurrent retry did not return the original intervention." >&2
  exit 1
fi

FINAL_COUNT="$(psql -v ON_ERROR_STOP=1 -Atq -c "select count(*) from public.intervenciones_ronda where metadata ->> 'convocatoria_id'='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';")"
FINAL_STATE="$(psql -v ON_ERROR_STOP=1 -Atq -c "select estado from public.convocatorias_ronda where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';")"
test "$FINAL_COUNT" = "1"
test "$FINAL_STATE" = "completada"

echo "PASS: invocation completion is atomic and idempotent; changed replays conflict; concurrent identical completions create one intervention."
