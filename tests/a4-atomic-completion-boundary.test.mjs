import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const core = read('api/arkhe-core.js');
const migration = read('supabase/migrations/20261011054000_complete_invocation_atomically.sql');
const start = core.indexOf('async function actionCompleteInvocation');
const end = core.indexOf('async function actionFailInvocation', start);
const completion = core.slice(start, end);

test('A4 completion uses one atomic RPC and never splits intervention insert from state update', () => {
  assert.ok(start >= 0 && end > start, 'actionCompleteInvocation boundaries must exist');
  assert.match(completion, /arkhe_complete_invocation_atomically/);
  assert.doesNotMatch(completion, /arkhe_insert_intervencion_ronda/);
  assert.doesNotMatch(completion, /\.from\(['"]convocatorias_ronda['"]\)\s*\.update\(/);
  assert.match(completion, /createHash\(['"]sha256['"]\)/);
  assert.match(completion, /idempotent_replay/);
});

test('A4 Core uses a server-only Supabase service-role credential', () => {
  const match = core.match(/function getSupabase\(\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'server Supabase factory must exist');
  assert.match(match[0], /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(match[0], /VITE_SUPABASE_KEY/);
});

test('atomic completion migration locks invocation row and replays only an identical fingerprint', () => {
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS intervenciones_ronda_convocatoria_id_unique_idx/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /completion_fingerprint/);
  assert.match(migration, /idempotent_replay/);
  assert.match(migration, /FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /TO service_role/);
});
