import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20261009210448_create_epistemic_semantic_relations.sql', import.meta.url), 'utf8');

test('semantic relation schema stores directed claims, evidence and provenance', () => {
  for (const field of [
    'source_node_id bigint',
    'target_node_id bigint',
    'relation_type text',
    'assertion text',
    'evidence_text text',
    'evidence_node_id bigint',
    'evidence_uri text',
    'created_by_investigator_id uuid',
    'origin_kind text',
    'origin_channel text',
    'provider text',
    'model text',
    'run_ref text',
    'provenance jsonb',
    'supersedes_relation_id uuid',
  ]) assert.ok(migration.includes(field), 'missing schema field: ' + field);
  assert.match(migration, /create table if not exists public\.arkhe_semantic_relation_events/i);
});

test('new semantic tables enable RLS and only expose direct read access to public clients', () => {
  assert.match(migration, /alter table public\.arkhe_semantic_relations enable row level security/i);
  assert.match(migration, /alter table public\.arkhe_semantic_relation_events enable row level security/i);
  assert.match(migration, /for select to anon, authenticated\s+using \(true\)/i);
  assert.match(migration, /revoke all on table public\.arkhe_semantic_relations from public, anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.arkhe_semantic_relation_events from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /grant insert .* to anon|grant update .* to anon|grant delete .* to anon/i);
});

test('semantic relation registration function requires evidence and is not executable by public roles', () => {
  assert.match(migration, /create or replace function public\.arkhe_register_semantic_relation/i);
  assert.match(migration, /if p_evidence_text is null or length\(btrim\(p_evidence_text\)\) < 8/i);
  assert.match(migration, /if p_provenance is null or jsonb_typeof\(p_provenance\) <> 'object'/i);
  assert.match(migration, /revoke all on function public\.arkhe_register_semantic_relation/i);
  assert.match(migration, /grant execute on function public\.arkhe_register_semantic_relation[\s\S]*?to service_role/i);
});


test('service-role table DML is revoked so writes must use the registration RPC', () => {
  const hardening = fs.readFileSync(new URL('../supabase/migrations/20261009211409_lock_semantic_relation_direct_writes.sql', import.meta.url), 'utf8');
  assert.match(hardening, /revoke insert, update, delete, truncate, references, trigger[\s\S]*?from service_role/i);
  assert.match(hardening, /grant select on table public\.arkhe_semantic_relations to service_role/i);
  assert.match(hardening, /grant select on table public\.arkhe_semantic_relation_events to service_role/i);
});


test('write API migration constrains review authors, supersession scope, direct write privileges, and actor throttles', () => {
  const apiMigration = fs.readFileSync(new URL('../supabase/migrations/20261009214326_semantic_relation_write_api.sql', import.meta.url), 'utf8');
  assert.match(apiMigration, /arkhe_append_semantic_relation_event/i);
  assert.match(apiMigration, /p_actor_kind is distinct from 'human'/i);
  assert.match(apiMigration, /previous_relation\.source_node_id = p_source_node_id/i);
  assert.match(apiMigration, /arkhe_reserve_semantic_write/i);
  assert.match(apiMigration, /request_count < 30/i);
  assert.match(apiMigration, /revoke all on table public\.arkhe_semantic_write_windows from public, anon, authenticated, service_role/i);
  assert.match(apiMigration, /revoke all on function public\.arkhe_append_semantic_relation_event/i);
  assert.match(apiMigration, /grant execute on function public\.arkhe_append_semantic_relation_event[\s\S]*?to service_role/i);
});


test('Tlacuilo nonce migration adds only the dedicated executor identity to the allowlist', () => {
  const tlacuiloMigration = fs.readFileSync(
    new URL('../supabase/migrations/20261010100000_allow_tlacuilo_executor_nonces.sql', import.meta.url),
    'utf8'
  );
  assert.match(tlacuiloMigration, /core_request_nonces_service_id_check/i);
  assert.match(tlacuiloMigration, /'atlas'::text, 'aletheia'::text, 'tekton'::text, 'tlacuilo'::text/i);
  assert.doesNotMatch(tlacuiloMigration, /'production'|'admin'|'service_role'/i);
});

test('post-API hardening migration restores RPC-only table writes after the base function migration', () => {
  const relock = fs.readFileSync(new URL('../supabase/migrations/20261009214834_relock_semantic_relation_direct_writes_after_api_migration.sql', import.meta.url), 'utf8');
  assert.match(relock, /revoke insert, update, delete, truncate, references, trigger[\s\S]*?on table public\.arkhe_semantic_relations[\s\S]*?from service_role/i);
  assert.match(relock, /revoke insert, update, delete, truncate, references, trigger[\s\S]*?on table public\.arkhe_semantic_relation_events[\s\S]*?from service_role/i);
  assert.match(relock, /revoke all on table public\.arkhe_semantic_write_windows[\s\S]*?from public, anon, authenticated, service_role/i);
});


test('Tlacuilo delegation is one-shot at the database layer, not only in runner preflight', () => {
  const singleUseMigration = fs.readFileSync(
    new URL('../supabase/migrations/20261010103000_enforce_tlacuilo_policy_single_use.sql', import.meta.url),
    'utf8'
  );
  assert.match(singleUseMigration, /create unique index if not exists/i);
  assert.match(singleUseMigration, /arkhe_semantic_relations_tlacuilo_policy_once_idx/);
  assert.match(singleUseMigration, /provenance #>> '\\{delegation,policy_id\\}'/);
  assert.match(singleUseMigration, /tlacuilo-smoke-relation-5-6-duplicates-v1/);
  assert.doesNotMatch(singleUseMigration, /drop index|drop constraint/i);
});
