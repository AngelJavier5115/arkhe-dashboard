import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const endpoint = read('api/arkhe-round-preflight.js');
const panel = read('src/CoreGovernancePanel.jsx');

test('Round preflight is a separate, authenticated, read-only API route', () => {
  assert.match(endpoint, /req\.method !== 'POST'/);
  assert.match(endpoint, /requireSameOrigin\(req\)/);
  assert.match(endpoint, /requireRecentHumanSession\(req, supabase\)/);
  assert.match(endpoint, /activeSession\(session\)/);
  assert.match(endpoint, /isRecentReauthentication\(/);
  assert.match(endpoint, /SYNTHETIC_INVESTIGATION_CODE = 'A4-STAGE-001'/);
  assert.match(endpoint, /Cache-Control', 'no-store'/);

  for (const forbidden of ['.insert(', '.update(', '.delete(', '.rpc(']) {
    assert.equal(endpoint.includes(forbidden), false, 'preflight must not perform database writes or mutations');
  }
  for (const [key, count] of Object.entries({
    rounds_created: 0,
    convocations_created: 0,
    dispatches_sent: 0,
    interventions_written: 0,
    semantic_writes: 0,
  })) {
    assert.match(endpoint, new RegExp(key + ': ' + count));
  }
});

test('Round preflight checks project state, participation, investigator availability, rounds and optional node membership', () => {
  for (const required of [
    "from('investigaciones_proyecto')",
    "from('participaciones')",
    "from('investigadores')",
    "from('rondas_investigacion')",
    "from('investigaciones')",
    "from('investigacion_nodos')",
    "project.estado === 'activa'",
    "participation?.estado === 'activo'",
    "investigator.estado === 'disponible'",
    "investigator.estado === 'ocupado'",
    'ready_to_create: readyToCreate',
  ]) {
    assert.ok(endpoint.includes(required), 'missing preflight control: ' + required);
  }
});

test('Round creation UI requires a fresh preflight that still matches current inputs', () => {
  assert.match(panel, /api\/arkhe-round-preflight/);
  assert.match(panel, /currentPreflightKey/);
  assert.match(panel, /preflightIsCurrent/);
  assert.match(panel, /currentPreflightReady/);

  const createStart = panel.indexOf('const createRoundAndInvocations');
  const createEnd = panel.indexOf('const loadExistingStagingRound', createStart);
  assert.ok(createStart >= 0 && createEnd > createStart);
  assert.match(panel.slice(createStart, createEnd), /if \(!currentPreflightReady\)/);
  assert.match(panel, /disabled=\{!recentReauth \|\| busy !== '' \|\| Boolean\(round\) \|\| roundCreationUncertain \|\| !currentPreflightReady\}/);
  assert.match(panel, /useState\('A4-STAGE-001'\)/);
  assert.match(panel, /Revisar antes de crear/);
  assert.match(panel, /El preflight es una ayuda de revisión, no una autorización/);
});

test('Active round date formatting is locally defined by the governance panel', () => {
  assert.match(panel, /function formatRoundDate\(value\)/);
  assert.match(panel, /formatRoundDate\(activeRound\.created_at\)/);
  assert.doesNotMatch(panel, /formatDate\(activeRound\.created_at/);
});
