import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import {
  buildCoreDispatchPayload,
  createCoreDispatchEnvelope,
  resolveCoreDispatchTarget,
  DISPATCH_TTL_MS
} from '../api/core-dispatch-signing.js';

const CONVOCATION_ID = '11111111-1111-4111-8111-111111111111';
const DISPATCH_ID = '22222222-2222-4222-8222-222222222222';

function keyPair() {
  const pair = generateKeyPairSync('ed25519');
  return {
    privateKeyPem: pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKey: pair.publicKey
  };
}

test('Core dispatch signs the exact body and targets a fixed investigator audience', () => {
  const pair = keyPair();
  const envelope = createCoreDispatchEnvelope({
    serviceId: 'atlas',
    convocatoriaId: CONVOCATION_ID,
    privateKeyPem: pair.privateKeyPem,
    timestamp: 1_800_000_000_000,
    dispatchId: DISPATCH_ID,
    endpointUrl: 'https://atlas-bot.example.onrender.com/arkhe/invocation'
  });

  assert.deepEqual(JSON.parse(envelope.serializedBody), {
    dispatch_id: DISPATCH_ID,
    convocatoria_id: CONVOCATION_ID
  });
  assert.equal(envelope.headers['x-arkhe-dispatch-target'], 'atlas');
  assert.equal(envelope.headers['x-arkhe-dispatch-id'], DISPATCH_ID);
  assert.equal(envelope.expiresAt, new Date(1_800_000_000_000 + DISPATCH_TTL_MS).toISOString());

  const timestamp = envelope.headers['x-arkhe-dispatch-timestamp'];
  const payload = buildCoreDispatchPayload({
    serviceId: 'atlas',
    timestamp,
    dispatchId: DISPATCH_ID,
    serializedBody: envelope.serializedBody
  });
  assert.equal(
    verify(null, Buffer.from(payload), pair.publicKey, Buffer.from(envelope.headers['x-arkhe-dispatch-signature'], 'base64url')),
    true
  );

  const changedPayload = buildCoreDispatchPayload({
    serviceId: 'atlas',
    timestamp,
    dispatchId: DISPATCH_ID,
    serializedBody: JSON.stringify({ dispatch_id: DISPATCH_ID, convocatoria_id: '33333333-3333-4333-8333-333333333333' })
  });
  assert.equal(
    verify(null, Buffer.from(changedPayload), pair.publicKey, Buffer.from(envelope.headers['x-arkhe-dispatch-signature'], 'base64url')),
    false
  );
});

test('Core dispatch target comes from service allowlist, not request body', () => {
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://atlas-bot-8in0.onrender.com/arkhe/invocation'
  }), /debe apuntar exactamente a https:\/\/atlas-preview\.onrender\.com/);

  const target = resolveCoreDispatchTarget('aletheia', {
    ARKHE_ALETHEIA_DISPATCH_URL: 'https://aletheia-preview.onrender.com/arkhe/invocation'
  });
  assert.equal(target.serviceId, 'aletheia');
  assert.equal(target.investigadorId, '122483a9-5012-46ce-a328-5bdb08b4de01');
  assert.equal(target.url, 'https://aletheia-preview.onrender.com/arkhe/invocation');

  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://example.com/arkhe/invocation'
  }), /debe apuntar exactamente/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'http://atlas-preview.onrender.com/arkhe/invocation'
  }), /debe apuntar exactamente/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://unapproved-service.onrender.com/arkhe/invocation'
  }), /debe apuntar exactamente/);
  assert.throws(() => resolveCoreDispatchTarget('atlas', {
    ARKHE_ATLAS_DISPATCH_URL: 'https://aletheia-preview.onrender.com/arkhe/invocation'
  }), /debe apuntar exactamente.*atlas-preview\.onrender\.com/);
  assert.throws(() => resolveCoreDispatchTarget('tekton', {}), /no está configurado/);
  assert.throws(() => resolveCoreDispatchTarget('unknown', {}), /no reconocido/);
});

test('Core dispatch fails closed for missing, malformed, or non-Ed25519 keys', () => {
  assert.throws(() => createCoreDispatchEnvelope({
    serviceId: 'atlas', convocatoriaId: CONVOCATION_ID, privateKeyPem: ''
  }), /no está configurado/);

  assert.throws(() => createCoreDispatchEnvelope({
    serviceId: 'atlas', convocatoriaId: CONVOCATION_ID, privateKeyPem: 'not-a-key'
  }), /llave privada PEM válida/);

  const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const rsaPem = rsa.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  assert.throws(() => createCoreDispatchEnvelope({
    serviceId: 'atlas', convocatoriaId: CONVOCATION_ID, privateKeyPem: rsaPem
  }), /debe ser Ed25519/);
});

test('Core dispatch rejects invalid invocation and dispatch identifiers', () => {
  const pair = keyPair();
  assert.throws(() => createCoreDispatchEnvelope({
    serviceId: 'atlas', convocatoriaId: 'not-a-uuid', privateKeyPem: pair.privateKeyPem
  }), /convocatoria_id debe ser un UUID/);
  assert.throws(() => createCoreDispatchEnvelope({
    serviceId: 'atlas', convocatoriaId: CONVOCATION_ID, privateKeyPem: pair.privateKeyPem, dispatchId: 'bad-id'
  }), /dispatch_id debe ser un UUID v4/);
});
