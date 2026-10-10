#!/usr/bin/env bash
set -euo pipefail

# Isolated PostgreSQL integration check for the exact one-shot migration.
# This runs against a disposable CI database, never the shared Arkhé database.
export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
export PGDATABASE="${PGDATABASE:-tlacuilo_test}"

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.arkhe_semantic_relations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb
);
SQL

psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261010103000_enforce_tlacuilo_policy_single_use.sql

psql -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.arkhe_semantic_relations (provenance)
VALUES
  ('{"delegation":{"policy_id":"tlacuilo-smoke-relation-5-6-duplicates-v1"}}'::jsonb),
  ('{"delegation":{"policy_id":"unrelated-policy"}}'::jsonb),
  ('{}'::jsonb);
SQL

LOG_FILE="$(mktemp)"
trap 'rm -f "$LOG_FILE"' EXIT

if psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.arkhe_semantic_relations (provenance) VALUES ('{\"delegation\":{\"policy_id\":\"tlacuilo-smoke-relation-5-6-duplicates-v1\"}}'::jsonb);" >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo "FAIL: a second proposal with the one-shot Tlacuilo policy was accepted." >&2
  exit 1
fi

if ! grep -q "arkhe_semantic_relations_tlacuilo_policy_once_idx" "$LOG_FILE"; then
  cat "$LOG_FILE"
  echo "FAIL: the second proposal failed for an unexpected reason." >&2
  exit 1
fi

POLICY_ROWS="$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT count(*) FROM public.arkhe_semantic_relations WHERE provenance #>> '{delegation,policy_id}' = 'tlacuilo-smoke-relation-5-6-duplicates-v1';")"
TOTAL_ROWS="$(psql -v ON_ERROR_STOP=1 -tA -c "SELECT count(*) FROM public.arkhe_semantic_relations;")"

test "$POLICY_ROWS" = "1"
test "$TOTAL_ROWS" = "3"
echo "PASS: the first approved policy row succeeds; a duplicate is rejected; unrelated provenance rows remain allowed."
