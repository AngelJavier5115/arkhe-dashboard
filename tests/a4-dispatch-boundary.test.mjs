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
  assert.match(action, /AbortSignal\.timeout\(7000\)/);
  assert.match(action, /No lo reintentes automáticamente/);
  assert.doesNotMatch(action, /body\.url|body\.target_url/);
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
