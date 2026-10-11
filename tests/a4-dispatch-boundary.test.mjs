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
const migration = read('supabase/migrations/20261011060000_signed_invocation_dispatch.sql');

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

test('Core dispatch endpoint is selected by investigator allowlist and fails closed without Preview configuration', () => {
  assert.equal(resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://atlas-preview.onrender.com/arkhe/invocation'
  }).url, 'https://atlas-preview.onrender.com/arkhe/invocation');
  assert.throws(() => resolveCoreDispatchTarget('atlas', {}), /no está configurado/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://example.org/arkhe/invocation'
  }), /HTTPS de Render/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'http://atlas-preview.onrender.com/arkhe/invocation'
  }), /HTTPS de Render/);
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
  assert.match(migration, /v_dispatch\.investigador_id IS DISTINCT FROM p_investigador_id/);
  assert.match(migration, /status <> 'issued'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.arkhe_issue_invocation_dispatch[\s\S]*?FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.arkhe_claim_invocation_dispatch[\s\S]*?FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.arkhe_claim_invocation_dispatch[\s\S]*?TO service_role/);
});
