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
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  'perspectiva', 'enviada',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
);
SQL

DISPATCH_MIGRATION="supabase/migrations/20261011053000_signed_invocation_dispatch.sql"
if [[ ! -f "$DISPATCH_MIGRATION" ]]; then
  echo "FAIL: signed dispatch migration not found: $DISPATCH_MIGRATION" >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 -f "$DISPATCH_MIGRATION"

MIGRATION="supabase/migrations/20261011054000_complete_invocation_atomically.sql"
if [[ ! -f "$MIGRATION" ]]; then
  echo "FAIL: atomic completion migration not found: $MIGRATION" >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 -f "$MIGRATION"

psql -v ON_ERROR_STOP=1 -c "select public.arkhe_issue_invocation_dispatch(
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  now() + interval '90 seconds'
);"
psql -v ON_ERROR_STOP=1 -c "select public.arkhe_claim_invocation_dispatch(
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f'
);"

CALL="select public.arkhe_complete_invocation_atomically(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
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
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
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
psql -v ON_ERROR_STOP=1 -c "TRUNCATE public.intervenciones_ronda, public.core_invocation_dispatches, public.convocatorias_ronda;"
psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.convocatorias_ronda (
  id,ronda_id,convocada_por,investigador_id,tipo_convocatoria,estado,correlation_id
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  'perspectiva','enviada',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
);"
psql -v ON_ERROR_STOP=1 -c "select public.arkhe_issue_invocation_dispatch(
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  now() + interval '90 seconds'
);"
psql -v ON_ERROR_STOP=1 -c "select public.arkhe_claim_invocation_dispatch(
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f'
);"
rm -f "$LOCK_READY"
psql -v ON_ERROR_STOP=1 >"$FIRST_LOG" 2>&1 <<'SQL' &
BEGIN;
SELECT public.arkhe_complete_invocation_atomically(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
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

# Signed dispatch claim lifecycle: issuance is bound to Angel + a human-created
# pending invocation; only the matching investigator may claim it once.
psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.convocatorias_ronda (
  id,ronda_id,convocada_por,investigador_id,tipo_convocatoria,estado,correlation_id
) VALUES (
  '44444444-4444-4444-8444-444444444444',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  'perspectiva','enviada',
  '55555555-5555-4555-8555-555555555555'
);"

ISSUE_RESULT="$(psql -v ON_ERROR_STOP=1 -Atq -c "select public.arkhe_issue_invocation_dispatch(
  '66666666-6666-4666-8666-666666666666',
  '44444444-4444-4444-8444-444444444444',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  now() + interval '90 seconds'
);")"
if ! printf '%s' "$ISSUE_RESULT" | grep -q '"status": "issued"'; then
  printf '%s\n' "$ISSUE_RESULT"
  echo "FAIL: dispatch was not issued." >&2
  exit 1
fi

if psql -v ON_ERROR_STOP=1 -c "select public.arkhe_issue_invocation_dispatch(
  '77777777-7777-4777-8777-777777777777',
  '44444444-4444-4444-8444-444444444444',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  now() + interval '90 seconds'
);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a second active dispatch was issued for the same invocation." >&2
  exit 1
fi

if psql -v ON_ERROR_STOP=1 -c "select public.arkhe_claim_invocation_dispatch(
  '66666666-6666-4666-8666-666666666666',
  '44444444-4444-4444-8444-444444444444',
  '656726d1-8209-4240-8169-a7434074609d'
);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a different investigator claimed the dispatch." >&2
  exit 1
fi
if ! grep -q "not assigned to the authenticated investigator" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: wrong-investigator claim failed for an unexpected reason." >&2
  exit 1
fi

CLAIM_RESULT="$(psql -v ON_ERROR_STOP=1 -Atq -c "select public.arkhe_claim_invocation_dispatch(
  '66666666-6666-4666-8666-666666666666',
  '44444444-4444-4444-8444-444444444444',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f'
);")"
if ! printf '%s' "$CLAIM_RESULT" | grep -q '"status": "claimed"'; then
  printf '%s\n' "$CLAIM_RESULT"
  echo "FAIL: the valid dispatch could not be claimed." >&2
  exit 1
fi

if psql -v ON_ERROR_STOP=1 -c "select public.arkhe_claim_invocation_dispatch(
  '66666666-6666-4666-8666-666666666666',
  '44444444-4444-4444-8444-444444444444',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f'
);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a one-shot dispatch was claimed twice." >&2
  exit 1
fi
if ! grep -q "already been claimed or revoked" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: replay was rejected for an unexpected reason." >&2
  exit 1
fi

DISPATCH_STATUS="$(psql -v ON_ERROR_STOP=1 -Atq -c "select status from public.core_invocation_dispatches where dispatch_id='66666666-6666-4666-8666-666666666666';")"
test "$DISPATCH_STATUS" = "claimed"

# An accepted dispatch can become ambiguous if the worker stops after claim.
# Reconciliation is manual, requires the human actor and a note, and revokes
# the old dispatch so a late worker cannot commit afterward.
psql -v ON_ERROR_STOP=1 -c "update public.core_invocation_dispatches
  set claimed_at = now() - interval '6 minutes'
  where dispatch_id='66666666-6666-4666-8666-666666666666';"

RECONCILE_RESULT="$(psql -v ON_ERROR_STOP=1 -Atq -c "select public.arkhe_reconcile_invocation_dispatch(
  '66666666-6666-4666-8666-666666666666',
  '44444444-4444-4444-8444-444444444444',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  'Worker timed out; checked that no intervention exists before re-authorizing.'
);")"
if ! printf '%s' "$RECONCILE_RESULT" | grep -q '"status": "revoked"'; then
  printf '%s\n' "$RECONCILE_RESULT"
  echo "FAIL: stale claimed dispatch was not explicitly reconciled." >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 -c "select public.arkhe_issue_invocation_dispatch(
  '77777777-7777-4777-8777-777777777777',
  '44444444-4444-4444-8444-444444444444',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  now() + interval '90 seconds'
);"
psql -v ON_ERROR_STOP=1 -c "select public.arkhe_claim_invocation_dispatch(
  '77777777-7777-4777-8777-777777777777',
  '44444444-4444-4444-8444-444444444444',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f'
);"

if psql -v ON_ERROR_STOP=1 -c "select public.arkhe_complete_invocation_atomically(
  '44444444-4444-4444-8444-444444444444',
  '66666666-6666-4666-8666-666666666666',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  'perspectiva',
  'Late result from revoked dispatch',
  null::uuid,
  null::bigint,
  '{\"testing\":true}'::jsonb,
  repeat('c',64)
);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a late worker committed after human reconciliation revoked its dispatch." >&2
  exit 1
fi
if ! grep -q "Dispatch is no longer active" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: revoked-dispatch completion failed for an unexpected reason." >&2
  exit 1
fi

NEW_COMPLETION="$(psql -v ON_ERROR_STOP=1 -Atq -c "select public.arkhe_complete_invocation_atomically(
  '44444444-4444-4444-8444-444444444444',
  '77777777-7777-4777-8777-777777777777',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  'perspectiva',
  'Completion from explicitly re-authorized dispatch',
  null::uuid,
  null::bigint,
  '{\"testing\":true}'::jsonb,
  repeat('d',64)
);")"
if ! printf '%s' "$NEW_COMPLETION" | grep -q '"idempotent_replay": false'; then
  printf '%s\n' "$NEW_COMPLETION"
  echo "FAIL: explicitly re-authorized dispatch could not complete the invocation." >&2
  exit 1
fi
test "$(psql -v ON_ERROR_STOP=1 -Atq -c "select estado from public.convocatorias_ronda where id='44444444-4444-4444-8444-444444444444';")" = "completada"

# An expired, unclaimed envelope cannot be claimed. Issuance of a new envelope
# is possible only through a later explicit human dispatch request.
psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.convocatorias_ronda (
  id,ronda_id,convocada_por,investigador_id,tipo_convocatoria,estado,correlation_id
) VALUES (
  '88888888-8888-4888-8888-888888888888',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  '122483a9-5012-46ce-a328-5bdb08b4de01',
  'perspectiva','pendiente',
  '99999999-9999-4999-8999-999999999999'
);"
psql -v ON_ERROR_STOP=1 -c "select public.arkhe_issue_invocation_dispatch(
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  '88888888-8888-4888-8888-888888888888',
  '122483a9-5012-46ce-a328-5bdb08b4de01',
  '2a003935-f248-442c-96fc-dcee29c4d41a',
  now() + interval '90 seconds'
);"
psql -v ON_ERROR_STOP=1 -c "update public.core_invocation_dispatches set expires_at=now()-interval '1 second' where dispatch_id='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';"
if psql -v ON_ERROR_STOP=1 -c "select public.arkhe_claim_invocation_dispatch(
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  '88888888-8888-4888-8888-888888888888',
  '122483a9-5012-46ce-a328-5bdb08b4de01'
);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: an expired dispatch was claimed." >&2
  exit 1
fi
if ! grep -q "Signed dispatch expired" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: expiry rejection did not report the expected reason." >&2
  exit 1
fi

echo "PASS: completion is atomic/idempotent and bound to the claimed dispatch; failure and reconciliation are race-safe; revoked late workers cannot commit."
