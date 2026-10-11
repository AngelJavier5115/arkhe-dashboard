#!/usr/bin/env bash
set -euo pipefail

# Disposable PostgreSQL test: one-shot policy, existing-pair guard, and a
# concurrent write race. This never connects to the shared Arkhé database.
export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
export PGDATABASE="${PGDATABASE:-tlacuilo_test}"

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.arkhe_semantic_relations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_node_id bigint NOT NULL,
  target_node_id bigint NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb
);
SQL

INDEX_MIGRATION="$(find supabase/migrations -maxdepth 1 -type f -name '*_enforce_tlacuilo_policy_single_use.sql' -print -quit)"
PAIR_GUARD_MIGRATION="$(find supabase/migrations -maxdepth 1 -type f -name '*_tlacuilo_atomic_pair_guard.sql' -print -quit)"
if [[ -z "$INDEX_MIGRATION" || -z "$PAIR_GUARD_MIGRATION" ]]; then
  echo "FAIL: required one-shot or atomic pair-guard migration could not be found." >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 -f "$INDEX_MIGRATION"
psql -v ON_ERROR_STOP=1 -f "$PAIR_GUARD_MIGRATION"

LOG_FILE="$(mktemp)"
RACE_LOG="$(mktemp)"
FIRST_LOG="$(mktemp)"
LOCK_READY="$(mktemp)"
rm -f "$LOCK_READY"
export LOCK_READY
trap 'rm -f "$LOG_FILE" "$RACE_LOG" "$FIRST_LOG" "$LOCK_READY"' EXIT

# Case 1: an unrelated actor already has a relation for #5/#6. Tlacuilo's
# proposal must be rejected before an insert can land.
psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance) VALUES (5,6,'{\"delegation\":{\"policy_id\":\"unrelated-policy\"}}'::jsonb);"
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance) VALUES (5,6,'{\"delegation\":{\"policy_id\":\"tlacuilo-smoke-relation-5-6-duplicates-v1\"}}'::jsonb);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: Tlacuilo was allowed to claim a pair that already had a relation." >&2
  exit 1
fi
if ! grep -q "Tlacuilo one-shot pair guard" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: existing-pair guard failed for an unexpected reason." >&2
  exit 1
fi
EXISTING_POLICY_ROWS="$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT count(*) FROM public.arkhe_semantic_relations WHERE provenance #>> '{delegation,policy_id}' = 'tlacuilo-smoke-relation-5-6-duplicates-v1';")"
test "$EXISTING_POLICY_ROWS" = "0"

# Reset only the disposable CI table for the one-shot-index test.
psql -v ON_ERROR_STOP=1 -c "TRUNCATE public.arkhe_semantic_relations RESTART IDENTITY;"

# First policy row succeeds, while unrelated pairs remain allowed.
psql -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance)
VALUES
  (5,6,'{"delegation":{"policy_id":"tlacuilo-smoke-relation-5-6-duplicates-v1"}}'::jsonb),
  (7,8,'{"delegation":{"policy_id":"unrelated-policy"}}'::jsonb),
  (9,10,'{}'::jsonb);
SQL

# Once Tlacuilo successfully claims its one-shot pair, a later ordinary writer
# must not add a second relation for the same unordered pair.
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance) VALUES (6,5,'{\\"delegation\\":{\\"policy_id\\":\\"unrelated-later-policy\\"}}'::jsonb);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a later ordinary relation was allowed to duplicate Tlacuilo's occupied pair." >&2
  exit 1
fi
if ! grep -q "Tlacuilo one-shot pair guard" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: later pair conflict was rejected for an unexpected reason." >&2
  exit 1
fi

# Reuse of the same pair/policy is rejected by the trigger.
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance) VALUES (5,6,'{\"delegation\":{\"policy_id\":\"tlacuilo-smoke-relation-5-6-duplicates-v1\"}}'::jsonb);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a second proposal with the one-shot Tlacuilo policy was accepted." >&2
  exit 1
fi
if ! grep -q "Tlacuilo one-shot pair guard" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: duplicate proposal was rejected for an unexpected reason." >&2
  exit 1
fi

# Test the partial unique index independently as defense in depth, without the
# trigger handling the insertion first. This is only in the disposable database.
psql -v ON_ERROR_STOP=1 -c "ALTER TABLE public.arkhe_semantic_relations DISABLE TRIGGER arkhe_semantic_relations_tlacuilo_pair_guard;"
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance) VALUES (5,6,'{\"delegation\":{\"policy_id\":\"tlacuilo-smoke-relation-5-6-duplicates-v1\"}}'::jsonb);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: unique index accepted a duplicate policy ID." >&2
  exit 1
fi
if ! grep -q "arkhe_semantic_relations_tlacuilo_policy_once_idx" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: the partial unique index test failed for an unexpected reason." >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 -c "ALTER TABLE public.arkhe_semantic_relations ENABLE TRIGGER arkhe_semantic_relations_tlacuilo_pair_guard;"

POLICY_ROWS="$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT count(*) FROM public.arkhe_semantic_relations WHERE provenance #>> '{delegation,policy_id}' = 'tlacuilo-smoke-relation-5-6-duplicates-v1';")"
TOTAL_ROWS="$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT count(*) FROM public.arkhe_semantic_relations;")"
test "$POLICY_ROWS" = "1"
test "$TOTAL_ROWS" = "3"

# Concurrency race: transaction A inserts a different relation for #5/#6 and
# holds its transaction-level pair lock. Transaction B then attempts Tlacuilo.
# It must wait for A, see A's committed row, and abort without adding its row.
psql -v ON_ERROR_STOP=1 -c "TRUNCATE public.arkhe_semantic_relations RESTART IDENTITY;"
psql -v ON_ERROR_STOP=1 >"$FIRST_LOG" 2>&1 <<'SQL' &
BEGIN;
INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance)
VALUES (6,5,'{"delegation":{"policy_id":"concurrent-unrelated-policy"}}'::jsonb);
\! touch "$LOCK_READY"
SELECT pg_sleep(2);
COMMIT;
SQL
FIRST_PID=$!
LOCK_HELD=""
for _ in $(seq 1 50); do
  if [[ -f "$LOCK_READY" ]]; then
    LOCK_HELD=1
    break
  fi
  sleep 0.1
done
if [[ -z "$LOCK_HELD" ]]; then
  kill "$FIRST_PID" 2>/dev/null || true
  wait "$FIRST_PID" 2>/dev/null || true
  cat "$FIRST_LOG"
  echo "FAIL: first PostgreSQL transaction did not signal that its pair lock was held." >&2
  exit 1
fi
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance) VALUES (5,6,'{\"delegation\":{\"policy_id\":\"tlacuilo-smoke-relation-5-6-duplicates-v1\"}}'::jsonb);" >"$RACE_LOG" 2>&1; then
  wait "$FIRST_PID"
  cat "$RACE_LOG"
  echo "FAIL: a concurrent Tlacuilo proposal raced past the pair guard." >&2
  exit 1
fi
wait "$FIRST_PID"
if ! grep -q "Tlacuilo one-shot pair guard" "$RACE_LOG"; then
  cat "$RACE_LOG"
  echo "FAIL: concurrent insert was rejected for an unexpected reason." >&2
  exit 1
fi

# Reverse race: Tlacuilo wins the pair lock first; an unrelated insert waiting
# behind it must be rejected after Tlacuilo commits.
psql -v ON_ERROR_STOP=1 -c "TRUNCATE public.arkhe_semantic_relations RESTART IDENTITY;"
rm -f "$LOCK_READY"
psql -v ON_ERROR_STOP=1 >"$FIRST_LOG" 2>&1 <<'SQL' &
BEGIN;
INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance)
VALUES (5,6,'{"delegation":{"policy_id":"tlacuilo-smoke-relation-5-6-duplicates-v1"}}'::jsonb);
\! touch "$LOCK_READY"
SELECT pg_sleep(2);
COMMIT;
SQL
FIRST_PID=$!
LOCK_HELD=""
for _ in $(seq 1 50); do
  if [[ -f "$LOCK_READY" ]]; then
    LOCK_HELD=1
    break
  fi
  sleep 0.1
done
if [[ -z "$LOCK_HELD" ]]; then
  kill "$FIRST_PID" 2>/dev/null || true
  wait "$FIRST_PID" 2>/dev/null || true
  cat "$FIRST_LOG"
  echo "FAIL: Tlacuilo transaction did not signal that its pair lock was held." >&2
  exit 1
fi
if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.arkhe_semantic_relations (source_node_id,target_node_id,provenance) VALUES (6,5,'{\\"delegation\\":{\\"policy_id\\":\\"concurrent-later-policy\\"}}'::jsonb);" >"$RACE_LOG" 2>&1; then
  wait "$FIRST_PID"
  cat "$RACE_LOG"
  echo "FAIL: an ordinary insert duplicated the pair after Tlacuilo won the race." >&2
  exit 1
fi
wait "$FIRST_PID"
if ! grep -q "Tlacuilo one-shot pair guard" "$RACE_LOG"; then
  cat "$RACE_LOG"
  echo "FAIL: the reverse concurrent insert was rejected for an unexpected reason." >&2
  exit 1
fi

FINAL_ROWS="$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT count(*) FROM public.arkhe_semantic_relations;")"
FINAL_POLICY_ROWS="$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT count(*) FROM public.arkhe_semantic_relations WHERE provenance #>> '{delegation,policy_id}' = 'tlacuilo-smoke-relation-5-6-duplicates-v1';")"
test "$FINAL_ROWS" = "1"
test "$FINAL_POLICY_ROWS" = "1"

echo "PASS: pair guard rejects pre-existing, prior-Tlacuilo and concurrent relations in both commit orders; first one-shot proposal succeeds; partial unique index independently rejects a duplicate; unrelated pairs remain allowed."
