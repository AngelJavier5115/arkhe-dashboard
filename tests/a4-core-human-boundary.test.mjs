import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const core = fs.readFileSync(new URL('../api/arkhe-core.js', import.meta.url), 'utf8');

test('A4: Core has a server-side human governor boundary', () => {
  assert.match(core, /async function requireHumanGovernor\(req(?:, \{ requireRecentReauth = false \} = \{\})?\)/);
  assert.match(core, /humanIdentity = await requireHumanGovernor\(req, \{ requireRecentReauth: true \}\)/);
});

test('A4: Core treats actor_id only as a consistency assertion', () => {
  assert.match(core, /function assertBodyActorMatches\(body, actorId\)/);
  assert.match(core, /assertBodyActorMatches\(body, humanIdentity\)/);
  assert.doesNotMatch(core, /requireAngel\(body\.actor_id\)/);
});

test('A4: human government actions receive the server-derived principal', () => {
  for (const call of [
    "actionStartRound(supabase, body, humanIdentity)",
    "actionCreateInvocations(supabase, body, humanIdentity)",
    "actionOpenDebate(supabase, body, humanIdentity)",
    "actionRoundState(supabase, body, 'pausada', humanIdentity)",
    "actionRoundState(supabase, body, 'cerrada', humanIdentity)",
    "actionRoundState(supabase, body, 'cancelada', humanIdentity)",
  ]) {
    assert.ok(core.includes(call), call);
  }
});
