import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ALLOWED_ROUND_TYPES,
  buildInvestigationPreflightReport,
  normalizeInvestigationPreflightInput,
} from '../api/investigation-preflight.js';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const core = read('api/arkhe-core.js');
const panel = read('src/CoreGovernancePanel.jsx');

const ATLAS = '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f';
const ALETHEIA = '122483a9-5012-46ce-a328-5bdb08b4de01';
const INVESTIGATION_ID = '11111111-1111-4111-8111-111111111111';
const NODE_ID = 7;

const body = {
  investigacion_codigo: 'AR-001',
  tipo: 'consulta',
  pregunta: '¿Qué evidencia sostiene la hipótesis?',
  participantes: [ATLAS, ALETHEIA],
  nodo_id: NODE_ID,
};

const investigation = {
  id: INVESTIGATION_ID,
  codigo: 'AR-001',
  titulo: 'Investigación de prueba',
  objetivo: 'Validar el flujo',
  estado: 'activa',
};

const healthyInput = () => normalizeInvestigationPreflightInput(body);
const healthyReport = overrides => buildInvestigationPreflightReport({
  input: healthyInput(),
  investigation,
  participationRows: [
    { investigador_id: ATLAS, estado: 'activo' },
    { investigador_id: ALETHEIA, estado: 'activo' },
  ],
  investigatorRows: [
    { id: ATLAS, nombre: 'Atlas' },
    { id: ALETHEIA, nombre: 'Aletheia' },
  ],
  profileRows: [
    { investigador_id: ATLAS, nombre_identitario: 'Atlas', especialidad: 'análisis', activo: true, version: 1 },
    { investigador_id: ALETHEIA, nombre_identitario: 'Aletheia', especialidad: 'falsación', activo: true, version: 1 },
  ],
  node: { id: NODE_ID, ref_id: 'node-7', tipo: 'hipotesis' },
  nodeLinked: true,
  openRounds: [],
  ...overrides,
});

test('preflight input shares the supported Core round types and normalizes duplicates without creating state', () => {
  assert.deepEqual(ALLOWED_ROUND_TYPES, ['consulta', 'debate', 'replica', 'confrontacion', 'aclaracion', 'cierre']);
  const parsed = normalizeInvestigationPreflightInput({ ...body, participantes: [ATLAS, ATLAS, ALETHEIA] });
  assert.deepEqual(parsed.participantes, [ATLAS, ALETHEIA]);
  assert.equal(parsed.investigacion_codigo, 'AR-001');
  assert.equal(parsed.nodo_id, NODE_ID);
});

test('preflight rejects malformed input before any database access', () => {
  assert.throws(() => normalizeInvestigationPreflightInput({ ...body, investigacion_codigo: '' }), /investigacion_id o investigacion_codigo/);
  assert.throws(() => normalizeInvestigationPreflightInput({ ...body, pregunta: '  ' }), /pregunta/);
  assert.throws(() => normalizeInvestigationPreflightInput({ ...body, participantes: [] }), /participantes/);
  assert.throws(() => normalizeInvestigationPreflightInput({ ...body, participantes: ['not-a-uuid'] }), /UUID válido/);
  assert.throws(() => normalizeInvestigationPreflightInput({ ...body, tipo: 'dispatch' }), /Tipo de ronda inválido/);
  assert.throws(() => normalizeInvestigationPreflightInput({ ...body, nodo_id: -2 }), /entero positivo/);
});

test('healthy preflight is ready, returns the plan, and reports zero business side effects', () => {
  const report = healthyReport();
  assert.equal(report.status, 'ready');
  assert.equal(report.ready_to_start, true);
  assert.equal(report.read_only, true);
  assert.deepEqual(report.effects, { rounds_created: 0, invitations_created: 0, dispatches_sent: 0 });
  assert.equal(report.plan.investigacion_id, INVESTIGATION_ID);
  assert.equal(report.plan.participantes.length, 2);
  assert.ok(report.checks.every(check => ['pass', 'skipped'].includes(check.status)));
});

test('open or paused rounds produce a warning but do not silently change or block the human decision', () => {
  const report = healthyReport({ openRounds: [
    { id: 'round-open', numero: 2, tipo: 'consulta', estado: 'abierta', pregunta: 'Revisar evidencia', created_at: '2026-10-12T12:00:00Z' },
  ] });
  assert.equal(report.status, 'warning');
  assert.equal(report.ready_to_start, true);
  assert.equal(report.open_rounds.length, 1);
  assert.equal(report.checks.find(check => check.id === 'existing_open_rounds').status, 'warning');
});

test('inactive investigation, missing participation/profile, and invalid anchor block start readiness', () => {
  const report = healthyReport({
    investigation: { ...investigation, estado: 'archivada' },
    participationRows: [{ investigador_id: ATLAS, estado: 'activo' }],
    profileRows: [{ investigador_id: ATLAS, nombre_identitario: 'Atlas', especialidad: 'análisis', activo: true, version: 1 }],
    node: { id: NODE_ID, ref_id: 'node-7', tipo: 'hipotesis' },
    nodeLinked: false,
  });
  assert.equal(report.status, 'blocked');
  assert.equal(report.ready_to_start, false);
  assert.equal(report.checks.find(check => check.id === 'investigation_active').status, 'blocked');
  assert.equal(report.checks.find(check => check.id === 'participants_active').status, 'blocked');
  assert.equal(report.checks.find(check => check.id === 'investigator_profiles').status, 'blocked');
  assert.equal(report.checks.find(check => check.id === 'anchor_node').status, 'blocked');
});

test('Core routes preflight only through the human identity boundary and the action itself is read-only', () => {
  const start = core.indexOf('async function actionPreflightInvestigation');
  const end = core.indexOf('async function actionStartRound', start);
  assert.ok(start >= 0 && end > start, 'preflight action must exist before round creation');
  const action = core.slice(start, end);
  for (const forbidden of ['.insert(', '.update(', '.delete(', '.rpc(', 'fetch(']) {
    assert.equal(action.includes(forbidden), false, 'preflight action must not contain ' + forbidden);
  }
  assert.match(core, /case 'preflight_investigacion':[\s\S]*?actionPreflightInvestigation\(supabase, body, humanIdentity\)/);
  const allowlistStart = core.indexOf('const SERVICE_INVESTIGATOR_ACTIONS');
  const allowlistEnd = core.indexOf(']);', allowlistStart) + 3;
  assert.ok(allowlistStart >= 0 && allowlistEnd > allowlistStart);
  assert.doesNotMatch(core.slice(allowlistStart, allowlistEnd), /preflight_investigacion/);
});

test('Round creation revalidates active investigation and active investigator profiles server-side', () => {
  const start = core.indexOf('async function actionStartRound');
  const invocations = core.indexOf('async function actionCreateInvocations');
  const end = core.indexOf('async function actionReconcileInvocationDispatch', invocations);
  assert.ok(start >= 0 && invocations > start && end > invocations, 'round and invocation actions must exist');
  const startAction = core.slice(start, invocations);
  const invocationAction = core.slice(invocations, end);
  assert.match(startAction, /investigacion\.estado !== 'activa'/);
  assert.match(startAction, /await assertActiveInvestigatorProfiles\(supabase, participantIds\)/);
  assert.match(invocationAction, /await assertActiveInvestigatorProfiles\(supabase, participantIds\)/);
  assert.match(core, /async function assertActiveInvestigatorProfiles\(supabase, participantIds\)/);
});

test('Dashboard requires a fresh preflight for the exact current form before round creation', () => {
  assert.match(panel, /READ_ONLY_CORE_ACTIONS = new Set\(\['consultar_ronda_prueba', 'preflight_investigacion'\]\)/);
  assert.match(panel, /setPreflightSnapshot\(\{ fingerprint, report \}\)/);
  assert.match(panel, /if \(!activePreflight\?\.ready_to_start\)/);
  assert.match(panel, /disabled=\{!recentReauth \|\| busy !== '' \|\| Boolean\(round\) \|\| roundCreationUncertain \|\| !activePreflight\?\.ready_to_start\}/);
  assert.match(panel, /Validar preparación \(solo lectura\)/);
});
