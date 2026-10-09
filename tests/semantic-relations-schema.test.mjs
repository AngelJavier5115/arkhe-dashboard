import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20261009205000_create_epistemic_semantic_relations.sql', import.meta.url), 'utf8');

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
