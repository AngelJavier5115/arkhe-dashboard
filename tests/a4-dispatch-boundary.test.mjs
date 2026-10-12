import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateKeyPairSync, verify } from 'node:crypto';
import {
  buildCoreDispatchPayload,
  createCoreDispatchEnvelope,
  resolveCoreDispatchTarget
} from '../api/core-dispatch-signing.js';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const core = read('api/arkhe-core.js');
const signing = read('api/core-dispatch-signing.js');
const migration = read('supabase/migrations/20261011053000_signed_invocation_dispatch.sql');
const reconciliationMigration = read('supabase/migrations/20261012052000_reconcile_expired_unclaimed_dispatch.sql');
const failedInvocationReconciliationMigration = read('supabase/migrations/20261012230145_allow_reconcile_error_claimed_dispatch.sql');
const dispatchStateMigration = read('supabase/migrations/20261012053000_read_latest_invocation_dispatches_staging.sql');
const constraintMigration = read('supabase/migrations/20261012054000_allow_audited_expired_dispatch.sql');
const panel = read('src/CoreGovernancePanel.jsx');
const humanAuthPanel = read('src/HumanAuthPanel.jsx');
const vercelConfig = JSON.parse(read('vercel.json'));

test('Core outbound dispatch signature binds service audience, dispatch ID and exact serialized body', () => {
  const pair = generateKeyPairSync('ed25519');
  const privateKeyPem = pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  const envelope = createCoreDispatchEnvelope({
    serviceId: 'aletheia',
    convocatoriaId: '11111111-1111-4111-8111-111111111111',
    privateKeyPem,
    dispatchId: '22222222-2222-4222-8222-222222222222',
    timestamp: 1_800_000_000_000,
    endpointUrl: 'https://aletheia-preview.onrender.com/arkhe/invocation'
  });

  const payload = buildCoreDispatchPayload({
    serviceId: 'aletheia',
    timestamp: envelope.headers['x-arkhe-dispatch-timestamp'],
    dispatchId: envelope.dispatchId,
    serializedBody: envelope.serializedBody
  });
  assert.equal(
    verify(null, Buffer.from(payload), pair.publicKey, Buffer.from(envelope.headers['x-arkhe-dispatch-signature'], 'base64url')),
    true
  );
  assert.equal(envelope.headers['x-arkhe-dispatch-target'], 'aletheia');
  assert.equal(JSON.parse(envelope.serializedBody).convocatoria_id, '11111111-1111-4111-8111-111111111111');

  const changed = buildCoreDispatchPayload({
    serviceId: 'atlas',
    timestamp: envelope.headers['x-arkhe-dispatch-timestamp'],
    dispatchId: envelope.dispatchId,
    serializedBody: envelope.serializedBody
  });
  assert.equal(
    verify(null, Buffer.from(changed), pair.publicKey, Buffer.from(envelope.headers['x-arkhe-dispatch-signature'], 'base64url')),
    false
  );
});

test('Core dispatch endpoint requires the exact per-investigator Preview host and fails closed otherwise', () => {
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://atlas-bot-8in0.onrender.com/arkhe/invocation'
  }), /deben|debe apuntar exactamente/);

  assert.equal(resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://atlas-preview.onrender.com/arkhe/invocation'
  }).url, 'https://atlas-preview.onrender.com/arkhe/invocation');
  assert.equal(resolveCoreDispatchTarget('aletheia', {
    ARKHE_ALETHEIA_DISPATCH_URL: 'https://aletheia-preview.onrender.com/arkhe/invocation'
  }).url, 'https://aletheia-preview.onrender.com/arkhe/invocation');
  assert.equal(resolveCoreDispatchTarget('tekton', {
    ARKHE_TEKTON_DISPATCH_URL: 'https://tekton-preview.onrender.com/arkhe/invocation'
  }).url, 'https://tekton-preview.onrender.com/arkhe/invocation');

  assert.throws(() => resolveCoreDispatchTarget('atlas', {}), /no está configurado/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://example.org/arkhe/invocation'
  }), /debe apuntar exactamente/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'http://atlas-preview.onrender.com/arkhe/invocation'
  }), /debe apuntar exactamente/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://other-unrelated-service.onrender.com/arkhe/invocation'
  }), /debe apuntar exactamente/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://aletheia-preview.onrender.com/arkhe/invocation'
  }), /debe apuntar exactamente.*atlas-preview\.onrender\.com/);
});

test('Only recent human governance can issue a dispatch; the target is derived from the database row', () => {
  const dispatchStart = core.indexOf('async function actionDispatchInvocation');
  const dispatchEnd = core.indexOf('async function actionGetInvocation', dispatchStart);
  assert.ok(dispatchStart >= 0 && dispatchEnd > dispatchStart, 'dispatch action boundaries must exist');
  const action = core.slice(dispatchStart, dispatchEnd);

  assert.match(core, /SERVICE_INVESTIGATOR_ACTIONS = new Set\([\s\S]*?'claim_convocation_dispatch'/);
  assert.match(core, /case 'despachar_convocatoria':[\s\S]*?actionDispatchInvocation\(supabase, body, humanIdentity\)/);
  assert.match(action, /actorId !== ANGEL_ID/);
  assert.match(action, /convocatoria\.convocada_por !== actorId/);
  assert.match(action, /convocatoria\.investigador_id/);
  assert.match(action, /arkhe_issue_invocation_dispatch/);
  assert.match(action, /AbortSignal\.timeout\(20_000\)/);
  assert.equal(vercelConfig.functions?.['api/arkhe-core.js']?.maxDuration, 30);
  assert.match(action, /No lo reintentes automáticamente/);
  assert.doesNotMatch(action, /body\.url|body\.target_url/);
});

test('Staging round recovery is read-only, human-governed, and scoped to A4-STAGE-001', () => {
  const start = core.indexOf('async function actionLoadStagingRound');
  const end = core.indexOf('async function actionStartRound', start);
  assert.ok(start >= 0 && end > start, 'staging round recovery handler must exist');
  const action = core.slice(start, end);
  assert.match(action, /actorId !== ANGEL_ID/);
  assert.match(action, /investigacion\.codigo !== 'A4-STAGE-001'/);
  assert.match(action, /from\('convocatorias_ronda'\)/);
  assert.doesNotMatch(action, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(core, /case 'consultar_ronda_prueba':[\s\S]*?actionLoadStagingRound\(supabase, body, humanIdentity\)/);
  const serviceActionsStart = core.indexOf('const SERVICE_INVESTIGATOR_ACTIONS');
  const serviceActionsEnd = core.indexOf(']);', serviceActionsStart) + 3;
  assert.ok(serviceActionsStart >= 0 && serviceActionsEnd > serviceActionsStart, 'service actions allowlist must exist');
  assert.doesNotMatch(core.slice(serviceActionsStart, serviceActionsEnd), /consultar_ronda_prueba/);
});

test('Service connectivity diagnostic authenticates the signed service and does not claim a dispatch', () => {
  assert.ok(core.includes("'diagnosticar_conexion'"));
  assert.ok(core.includes("case 'diagnosticar_conexion':"));
  assert.ok(core.includes("actionDiagnoseServiceConnection(serviceIdentity)"));
  const start = core.indexOf('async function actionDiagnoseServiceConnection');
  const end = core.indexOf('async function actionDispatchInvocation', start);
  assert.ok(start >= 0 && end > start, 'service diagnostic handler must exist before human dispatch handler');
  const handler = core.slice(start, end);
  assert.ok(handler.includes('serviceIdentity?.verified'));
  assert.ok(handler.includes('nonce_recorded: true'));
  for (const forbidden of ['.rpc(', '.insert(', '.update(', '.delete(']) {
    assert.equal(handler.includes(forbidden), false, 'diagnostic must not perform writes or dispatch RPCs');
  }
});

test('Processing, completion and failure require the exact claimed dispatch ID', () => {
  const getStart = core.indexOf('async function actionGetInvocation');
  const getEnd = core.indexOf('function raiseMappedCompletionError', getStart);
  const getAction = core.slice(getStart, getEnd);
  assert.match(getAction, /requireUuidShape\(body\.dispatch_id, 'dispatch_id'\)/);
  assert.match(getAction, /arkhe_validate_invocation_dispatch/);

  const completeStart = core.indexOf('async function actionCompleteInvocation');
  const completeEnd = core.indexOf('async function actionFailInvocation', completeStart);
  const complete = core.slice(completeStart, completeEnd);
  assert.match(complete, /requireUuidShape\(body\.dispatch_id, 'dispatch_id'\)/);
  assert.match(complete, /p_dispatch_id: dispatchId/);
  assert.match(complete, /dispatch_id: dispatchId/);

  const failStart = core.indexOf('async function actionFailInvocation');
  const failEnd = core.indexOf('async function actionOpenDebate', failStart);
  const failure = core.slice(failStart, failEnd);
  assert.match(failure, /arkhe_fail_invocation_atomically/);
  assert.match(failure, /p_dispatch_id: dispatchId/);
});

test('Browser auth and Core requests time out and release loading state instead of spinning forever', () => {
  assert.match(panel, /CORE_REQUEST_TIMEOUT_MS = 15000/);
  assert.match(panel, /setTimeout\(\(\) => controller\.abort\(\), CORE_REQUEST_TIMEOUT_MS\)/);
  assert.match(panel, /finally \{\s*clearTimeout\(timeoutId\);\s*\}/);
  assert.match(panel, /error\.networkAmbiguous = !readOnly/);
  assert.match(humanAuthPanel, /AUTH_REQUEST_TIMEOUT_MS = 15000/);
  assert.match(humanAuthPanel, /setTimeout\(\(\) => controller\.abort\(\), AUTH_REQUEST_TIMEOUT_MS\)/);
  assert.match(humanAuthPanel, /Actualiza la página y comprueba la sesión y las passkeys antes de repetir/);
  assert.match(humanAuthPanel, /finally \{\s*clearTimeout\(timeoutId\);\s*\}/);
});

test('WebAuthn ceremonies time out and abort stalled browser prompts so the auth panel can recover', () => {
  assert.match(humanAuthPanel, /WEBAUTHN_CEREMONY_TIMEOUT_MS = 60000/);
  assert.match(humanAuthPanel, /WebAuthnAbortService\.createNewAbortSignal\(\)/);
  assert.match(humanAuthPanel, /withWebAuthnCeremonyTimeout\(\s*startAuthentication/);
  assert.match(humanAuthPanel, /withWebAuthnCeremonyTimeout\(\s*startRegistration/);
  assert.match(humanAuthPanel, /Promise\.race\(\[ceremonyPromise, timeoutPromise\]\)/);
  assert.match(humanAuthPanel, /finally \{\s*clearTimeout\(timeoutId\);\s*\}/);
});

test('Expired dispatch constraint permits an audit note without weakening issued, claimed, or revoked invariants', () => {
  assert.ok(constraintMigration.includes("status = 'expired'"));
  assert.ok(constraintMigration.includes("claimed_at IS NULL"));
  assert.ok(constraintMigration.includes("revoked_at IS NULL"));
  assert.ok(constraintMigration.includes("revoked_by IS NULL"));
  assert.ok(constraintMigration.includes("OR length(btrim(reconciliation_note)) BETWEEN 10 AND 500"));
  assert.ok(constraintMigration.includes("status = 'revoked'"));
  assert.ok(constraintMigration.includes("claimed_at IS NOT NULL"));
  assert.ok(constraintMigration.includes("revoked_at IS NOT NULL"));
  assert.ok(constraintMigration.includes("revoked_by IS NOT NULL"));
});

test('Passkey flow waits for credential metadata before switching to the authenticated governance panel', () => {
  assert.ok(humanAuthPanel.includes('Fetch the dependent credential list before exposing the authenticated panel'));
  const refreshStart = humanAuthPanel.indexOf('const refreshSession = async');
  const refreshEnd = humanAuthPanel.indexOf('useEffect(', refreshStart);
  const refresh = humanAuthPanel.slice(refreshStart, refreshEnd);
  assert.ok(refresh.indexOf("await jsonFetch('/api/auth/webauthn/credentials')") < refresh.indexOf('setAuthenticated(isAuthenticated)'));
  assert.ok(humanAuthPanel.includes("setProgress('Confirma tu identidad con Face ID para continuar…')"));
  assert.ok(humanAuthPanel.includes('Face ID confirmado. Verificando la respuesta y la sesión…'));
  assert.ok(humanAuthPanel.includes('Comprobando la sesión humana existente antes de mostrar las acciones de acceso'));
  assert.ok(humanAuthPanel.includes("setProgress('');"));
  assert.ok(humanAuthPanel.includes('setBusy(false);'));
});

test('Human reconciliation is recent-WebAuthn-only and explicitly requires an audit note', () => {
  const start = core.indexOf('async function actionReconcileInvocationDispatch');
  const end = core.indexOf('async function actionGetInvocation', start);
  assert.ok(start >= 0 && end > start, 'reconciliation action bounds must exist');
  const action = core.slice(start, end);
  assert.match(core, /case 'reconciliar_despacho_convocatoria':[\s\S]*?actionReconcileInvocationDispatch\(supabase, body, humanIdentity\)/);
  assert.match(action, /actorId !== ANGEL_ID/);
  assert.match(action, /reconciliation_note/);
  assert.match(action, /arkhe_reconcile_invocation_dispatch/);
  assert.match(action, /requires_new_human_dispatch/);
  assert.match(action, /\['revoked', 'expired'\]\.includes\(data\?\.status\)/);
});

test('Expired unclaimed dispatches resolve to expired, never falsely revoked, after human review', () => {
  assert.match(reconciliationMigration, /v_dispatch\.status IN \('issued', 'expired'\)/);
  assert.match(reconciliationMigration, /v_dispatch\.claimed_at IS NULL/);
  assert.match(reconciliationMigration, /v_dispatch\.expires_at <= now\(\)/);
  assert.match(reconciliationMigration, /v_dispatch\.issued_at > now\(\) - interval '5 minutes'/);
  assert.match(reconciliationMigration, /SET status = 'expired',[\s\S]*?reconciliation_note = btrim\(p_reconciliation_note\)/);
  assert.match(reconciliationMigration, /'status', 'expired'/);
  assert.match(reconciliationMigration, /v_dispatch\.status = 'claimed'[\s\S]*?SET status = 'revoked'/);
  assert.match(reconciliationMigration, /Only the authenticated human governor may reconcile a dispatch/);
});

test('A.4 can revoke a claimed dispatch after terminal invocation error without altering invocation state', () => {
  assert.match(failedInvocationReconciliationMigration, /ip\.codigo = 'A4-STAGE-001'/);
  assert.match(failedInvocationReconciliationMigration, /v_convocatoria\.estado NOT IN \('enviada', 'pendiente'\)/);
  assert.match(failedInvocationReconciliationMigration, /IF v_dispatch\.status = 'claimed'[\s\S]*?v_convocatoria\.estado NOT IN \('enviada', 'pendiente', 'error'\)/);
  assert.match(failedInvocationReconciliationMigration, /v_dispatch\.claimed_at > now\(\) - interval '5 minutes'/);
  assert.match(failedInvocationReconciliationMigration, /metadata ->> 'convocatoria_id' = p_convocatoria_id::text[\s\S]*?metadata ->> 'dispatch_id' = p_dispatch_id::text/);
  assert.match(failedInvocationReconciliationMigration, /SET status = 'revoked',[\s\S]*?revoked_by = p_actor_id,[\s\S]*?reconciliation_note = btrim\(p_reconciliation_note\)/);
  assert.match(failedInvocationReconciliationMigration, /Only a pending invocation with an unclaimed expired dispatch can be marked expired/);
  assert.match(failedInvocationReconciliationMigration, /REVOKE ALL ON FUNCTION public\.arkhe_reconcile_invocation_dispatch\(uuid, uuid, uuid, text\) FROM PUBLIC, anon, authenticated/);
  assert.match(failedInvocationReconciliationMigration, /GRANT EXECUTE ON FUNCTION public\.arkhe_reconcile_invocation_dispatch\(uuid, uuid, uuid, text\) TO service_role/);
});

test('Persisted dispatch state is read through a staging-scoped server-only RPC', () => {
  assert.match(core, /rpc\('arkhe_get_latest_invocation_dispatches'/);
  assert.match(dispatchStateMigration, /ip\.codigo = 'A4-STAGE-001'/);
  assert.match(dispatchStateMigration, /SECURITY DEFINER/);
  assert.match(dispatchStateMigration, /REVOKE ALL ON FUNCTION public\.arkhe_get_latest_invocation_dispatches\(uuid\[\]\) FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(dispatchStateMigration, /GRANT EXECUTE ON FUNCTION public\.arkhe_get_latest_invocation_dispatches\(uuid\[\]\) TO service_role/);
  assert.match(dispatchStateMigration, /cardinality\(p_convocatoria_ids\) > 100/);
});

test('Staging round recovery restores the latest persisted dispatch state rather than resetting to idle', () => {
  const start = core.indexOf('async function actionLoadStagingRound');
  const end = core.indexOf('async function actionStartRound', start);
  assert.ok(start >= 0 && end > start);
  const recovery = core.slice(start, end);
  assert.match(recovery, /rpc\('arkhe_get_latest_invocation_dispatches'/);
  assert.match(recovery, /latest_dispatch: latestDispatchByInvocation\.get\(item\.id\) \?\? null/);
  assert.match(panel, /const previous = item\.latest_dispatch \?\? null/);
  assert.match(panel, /dispatchState = 'ambiguous'/);
  assert.match(panel, /const canDispatch = \['idle', 'revoked', 'expired', 'failed-before-issue'\]/);
});

test('Investigator claim is derived from signed service identity and calls the one-shot claim RPC', () => {
  const start = core.indexOf('async function actionClaimInvocationDispatch');
  const end = core.indexOf('async function actionDispatchInvocation', start);
  assert.ok(start >= 0 && end > start, 'claim action boundaries must exist');
  const action = core.slice(start, end);
  assert.match(core, /case 'claim_convocation_dispatch':[\s\S]*?actionClaimInvocationDispatch\(supabase, body, serviceIdentity\)/);
  assert.match(action, /requireBoundInvestigator\(serviceIdentity\)/);
  assert.match(action, /arkhe_claim_invocation_dispatch/);
  assert.match(action, /p_investigador_id: investigadorId/);
  assert.match(action, /p_dispatch_id: dispatchId/);
});

test('Dispatch RPCs are one-use, audience-bound, time-limited, and not executable by browser roles', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.core_invocation_dispatches/);
  assert.match(migration, /core_invocation_dispatches_one_active_per_invocation_idx/);
  assert.match(migration, /p_actor_id IS DISTINCT FROM '2a003935-f248-442c-96fc-dcee29c4d41a'/);
  assert.match(migration, /v_convocatoria\.convocada_por IS DISTINCT FROM p_actor_id/);
  assert.match(migration, /SELECT \*[\s\S]*?FROM public\.core_invocation_dispatches[\s\S]*?FOR UPDATE/);
  assert.match(migration, /p_investigador_id NOT IN \([\s\S]*?656726d1-8209-4240-8169-a7434074609d/);
  assert.match(migration, /v_dispatch\.investigador_id IS DISTINCT FROM p_investigador_id/);
  assert.match(migration, /status <> 'issued'/);
  assert.doesNotMatch(migration, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.core_invocation_dispatches/);
  const humanLock = migration.indexOf('FROM public.convocatorias_ronda', migration.indexOf('FUNCTION public.arkhe_claim_invocation_dispatch'));
  const dispatchLock = migration.indexOf('FROM public.core_invocation_dispatches', migration.indexOf('FUNCTION public.arkhe_claim_invocation_dispatch'));
  assert.ok(humanLock >= 0 && dispatchLock > humanLock, 'claim must lock invocation before dispatch row to maintain consistent lock order');
  assert.match(migration, /REVOKE ALL ON TABLE public\.core_invocation_dispatches FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.arkhe_issue_invocation_dispatch[\s\S]*?FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.arkhe_claim_invocation_dispatch[\s\S]*?FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.arkhe_claim_invocation_dispatch[\s\S]*?TO service_role/);
  assert.match(migration, /FUNCTION public\.arkhe_validate_invocation_dispatch/);
  assert.match(migration, /FUNCTION public\.arkhe_fail_invocation_atomically/);
  assert.match(migration, /FUNCTION public\.arkhe_reconcile_invocation_dispatch/);
  assert.match(migration, /v_dispatch\.claimed_at > now\(\) - interval '5 minutes'/);

});
