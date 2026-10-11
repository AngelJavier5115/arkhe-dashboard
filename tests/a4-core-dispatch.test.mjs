import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHash,
  generateKeyPairSync,
  verify
} from 'node:crypto';
import {
  assertCoreDispatchConfigured,
  buildCoreDispatchPayload,
  dispatchInvocation,
  signCoreDispatchRequest
} from '../api/core-dispatch.js';

function restoreEnv(name, previous) {
  if (previous === undefined) delete process.env[name];
  else process.env[name] = previous;
}

const VALID_INVOCATION = '11111111-1111-4111-8111-111111111111';

test('Core dispatch signs the exact JSON body and binds the signature to its target', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  const dispatchId = '22222222-2222-4222-8222-222222222222';
  const body = { dispatch_id: dispatchId, convocatoria_id: VALID_INVOCATION };
  const signed = signCoreDispatchRequest({
    serviceId: 'atlas',
    body,
    privateKeyPem,
    timestamp: 1_800_000_000_000,
    dispatchId
  });

  const payload = buildCoreDispatchPayload({
    serviceId: signed.headers['x-arkhe-dispatch-target'],
    timestamp: signed.headers['x-arkhe-dispatch-timestamp'],
    dispatchId: signed.headers['x-arkhe-dispatch-id'],
    serializedBody: signed.serializedBody
  });
  assert.equal(
    verify(null, Buffer.from(payload), publicKey, Buffer.from(signed.headers['x-arkhe-dispatch-signature'], 'base64url')),
    true
  );

  const changedPayload = buildCoreDispatchPayload({
    serviceId: 'aletheia',
    timestamp: signed.headers['x-arkhe-dispatch-timestamp'],
    dispatchId,
    serializedBody: signed.serializedBody
  });
  assert.equal(
    verify(null, Buffer.from(changedPayload), publicKey, Buffer.from(signed.headers['x-arkhe-dispatch-signature'], 'base64url')),
    false
  );

  const changedBody = JSON.stringify({ ...body, convocatoria_id: '33333333-3333-4333-8333-333333333333' });
  const alteredPayload = buildCoreDispatchPayload({
    serviceId: 'atlas',
    timestamp: signed.headers['x-arkhe-dispatch-timestamp'],
    dispatchId,
    serializedBody: changedBody
  });
  assert.equal(
    verify(null, Buffer.from(alteredPayload), publicKey, Buffer.from(signed.headers['x-arkhe-dispatch-signature'], 'base64url')),
    false
  );
});

test('dispatch signer fails closed on unknown targets, mismatched IDs, and non-Ed25519 keys', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const rsaPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();

  assert.throws(() => signCoreDispatchRequest({
    serviceId: 'unknown',
    body: { dispatch_id: '22222222-2222-4222-8222-222222222222' },
    privateKeyPem: rsaPem
  }), /Destino de despacho Core desconocido/);

  assert.throws(() => signCoreDispatchRequest({
    serviceId: 'atlas',
    body: { dispatch_id: '33333333-3333-4333-8333-333333333333' },
    privateKeyPem: rsaPem,
    dispatchId: '22222222-2222-4222-8222-222222222222'
  }), /debe coincidir/);

  assert.throws(() => signCoreDispatchRequest({
    serviceId: 'atlas',
    body: { dispatch_id: '22222222-2222-4222-8222-222222222222' },
    privateKeyPem: rsaPem,
    dispatchId: '22222222-2222-4222-8222-222222222222'
  }), /debe ser Ed25519/);
});

test('Preview dispatch requires a staging Render URL and never permits the live bot host', () => {
  const names = [
    'ARKHE_CORE_DISPATCH_PRIVATE_KEY',
    'ARKHE_ATLAS_INVOCATION_URL',
    'VERCEL_ENV',
    'ARKHE_CORE_DISPATCH_ENABLED'
  ];
  const prior = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const { privateKey } = generateKeyPairSync('ed25519');
  process.env.ARKHE_CORE_DISPATCH_PRIVATE_KEY = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  process.env.VERCEL_ENV = 'preview';
  delete process.env.ARKHE_CORE_DISPATCH_ENABLED;

  try {
    process.env.ARKHE_ATLAS_INVOCATION_URL = 'https://arkhe-atlas-preview.onrender.com/arkhe/invocation';
    assert.doesNotThrow(() => assertCoreDispatchConfigured(['atlas']));

    process.env.ARKHE_ATLAS_INVOCATION_URL = 'https://arkhe-atlas-preview.onrender.com/arkhe/invocation';
  process.env.VERCEL_ENV = 'preview';
    assert.throws(() => assertCoreDispatchConfigured(['atlas']), /entorno de despliegue autorizado/);

    process.env.ARKHE_ATLAS_INVOCATION_URL = 'https://attacker.example/arkhe/invocation';
    assert.throws(() => assertCoreDispatchConfigured(['atlas']), /entorno de despliegue autorizado/);
  } finally {
    for (const name of names) restoreEnv(name, prior[name]);
  }
});

test('Production dispatch requires explicit opt-in and the exact live Render target', () => {
  const names = [
    'ARKHE_CORE_DISPATCH_PRIVATE_KEY',
    'ARKHE_ATLAS_INVOCATION_URL',
    'VERCEL_ENV',
    'ARKHE_CORE_DISPATCH_ENABLED'
  ];
  const prior = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const { privateKey } = generateKeyPairSync('ed25519');
  process.env.ARKHE_CORE_DISPATCH_PRIVATE_KEY = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  process.env.VERCEL_ENV = 'production';
  process.env.ARKHE_ATLAS_INVOCATION_URL = 'https://atlas-bot-8in0.onrender.com/arkhe/invocation';

  try {
    delete process.env.ARKHE_CORE_DISPATCH_ENABLED;
    assert.throws(() => assertCoreDispatchConfigured(['atlas']), /ARKHE_CORE_DISPATCH_ENABLED=true/);

    process.env.ARKHE_CORE_DISPATCH_ENABLED = 'true';
    assert.doesNotThrow(() => assertCoreDispatchConfigured(['atlas']));
  } finally {
    for (const name of names) restoreEnv(name, prior[name]);
  }
});

test('dispatchInvocation accepts only the matching signed HTTP 202 acknowledgment and never auto-retries', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  const previous = {
    key: process.env.ARKHE_CORE_DISPATCH_PRIVATE_KEY,
    url: process.env.ARKHE_ATLAS_INVOCATION_URL,
    vercelEnv: process.env.VERCEL_ENV,
    fetch: globalThis.fetch
  };
  let captured = null;

  process.env.ARKHE_CORE_DISPATCH_PRIVATE_KEY = privateKeyPem;
  process.env.ARKHE_ATLAS_INVOCATION_URL = 'https://atlas-bot-8in0.onrender.com/arkhe/invocation';
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    const dispatchId = init.headers['x-arkhe-dispatch-id'];
    return {
      status: 202,
      json: async () => ({ ok: true, accepted: true, dispatch_id: dispatchId })
    };
  };

  try {
    const result = await dispatchInvocation({
      serviceId: 'atlas',
      convocatoriaId: VALID_INVOCATION,
      discordChannelId: '12345678901234567'
    });
    assert.equal(result.accepted, true);
    assert.equal(result.service_id, 'atlas');
    assert.equal(captured.init.headers['x-arkhe-dispatch-target'], 'atlas');
    assert.equal(captured.init.body, JSON.stringify(JSON.parse(captured.init.body)));

    const payload = buildCoreDispatchPayload({
      serviceId: 'atlas',
      timestamp: captured.init.headers['x-arkhe-dispatch-timestamp'],
      dispatchId: captured.init.headers['x-arkhe-dispatch-id'],
      serializedBody: captured.init.body
    });
    assert.equal(
      verify(null, Buffer.from(payload), publicKey, Buffer.from(captured.init.headers['x-arkhe-dispatch-signature'], 'base64url')),
      true
    );
  } finally {
    restoreEnv('ARKHE_CORE_DISPATCH_PRIVATE_KEY', previous.key);
    restoreEnv('ARKHE_ATLAS_INVOCATION_URL', previous.url);
    restoreEnv('VERCEL_ENV', previous.vercelEnv);
    globalThis.fetch = previous.fetch;
  }
});
