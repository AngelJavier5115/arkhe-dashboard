import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto';

const DISPATCH_TTL_MS = 90 * 1000;

// Never let a Preview configuration point at the currently active Render
// services. Staging endpoints must be separate services with their own config.
const ACTIVE_RENDER_HOSTS = new Set([
  'atlas-bot-8in0.onrender.com',
  'aletheia-bot-u6r3.onrender.com',
  'tekton-bot.onrender.com'
]);

export const CORE_DISPATCH_TARGETS = Object.freeze({
  atlas: {
    investigadorId: '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
    endpointEnv: 'ARKHE_ATLAS_DISPATCH_URL',
    previewHostname: 'atlas-preview.onrender.com'
  },
  aletheia: {
    investigadorId: '122483a9-5012-46ce-a328-5bdb08b4de01',
    endpointEnv: 'ARKHE_ALETHEIA_DISPATCH_URL',
    previewHostname: 'aletheia-preview.onrender.com'
  },
  tekton: {
    investigadorId: '656726d1-8209-4240-8169-a7434074609d',
    endpointEnv: 'ARKHE_TEKTON_DISPATCH_URL',
    previewHostname: 'tekton-preview.onrender.com'
  }
});

function dispatchError(message, status = 503) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function buildCoreDispatchPayload({ serviceId, timestamp, dispatchId, serializedBody }) {
  const bodyHash = createHash('sha256').update(serializedBody, 'utf8').digest('hex');
  return [
    'arkhe-core-dispatch-v1',
    serviceId,
    String(timestamp),
    dispatchId,
    bodyHash
  ].join('.');
}

export function resolveCoreDispatchTarget(serviceId, env = process.env) {
  const target = CORE_DISPATCH_TARGETS[serviceId];
  if (!target) throw dispatchError('Investigador de despacho no reconocido.', 400);

  const raw = env[target.endpointEnv];
  if (!raw) throw dispatchError(target.endpointEnv + ' no está configurado para Preview.');

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw dispatchError(target.endpointEnv + ' no contiene una URL válida.');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    hostname !== target.previewHostname ||
    ACTIVE_RENDER_HOSTS.has(hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/arkhe/invocation' ||
    url.search ||
    url.hash
  ) {
    throw dispatchError(
      target.endpointEnv + ' debe apuntar exactamente a https://' +
      target.previewHostname + '/arkhe/invocation. Los demás hosts, incluidos producción y otros servicios de Render, quedan bloqueados.'
    );
  }

  return { ...target, serviceId, url: url.toString() };
}

export function createCoreDispatchEnvelope({
  serviceId,
  convocatoriaId,
  privateKeyPem = process.env.ARKHE_CORE_DISPATCH_PRIVATE_KEY,
  timestamp = Date.now(),
  dispatchId = randomUUID(),
  endpointUrl
}) {
  const target = CORE_DISPATCH_TARGETS[serviceId];
  if (!target) throw dispatchError('Investigador de despacho no reconocido.', 400);
  if (typeof convocatoriaId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(convocatoriaId)) {
    throw dispatchError('convocatoria_id debe ser un UUID válido.', 400);
  }
  if (!privateKeyPem) {
    throw dispatchError('ARKHE_CORE_DISPATCH_PRIVATE_KEY no está configurado para Preview.');
  }
  if (!Number.isSafeInteger(Number(timestamp))) {
    throw dispatchError('Timestamp de despacho no válido.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dispatchId)) {
    throw dispatchError('dispatch_id debe ser un UUID v4.', 400);
  }

  let key;
  try {
    key = createPrivateKey(String(privateKeyPem).replace(/\\n/g, '\n').trim());
  } catch {
    throw dispatchError('ARKHE_CORE_DISPATCH_PRIVATE_KEY no contiene una llave privada PEM válida.');
  }
  if (key.asymmetricKeyType !== 'ed25519') {
    throw dispatchError('ARKHE_CORE_DISPATCH_PRIVATE_KEY debe ser Ed25519.');
  }

  const body = { dispatch_id: dispatchId, convocatoria_id: convocatoriaId };
  const serializedBody = JSON.stringify(body);
  const payload = buildCoreDispatchPayload({
    serviceId,
    timestamp,
    dispatchId,
    serializedBody
  });
  const signature = sign(null, Buffer.from(payload, 'utf8'), key).toString('base64url');

  return {
    serviceId,
    dispatchId,
    convocatoriaId,
    serializedBody,
    body,
    headers: {
      'Content-Type': 'application/json',
      'x-arkhe-dispatch-target': serviceId,
      'x-arkhe-dispatch-timestamp': String(timestamp),
      'x-arkhe-dispatch-id': dispatchId,
      'x-arkhe-dispatch-signature': signature
    },
    expiresAt: new Date(Number(timestamp) + DISPATCH_TTL_MS).toISOString(),
    url: endpointUrl ?? null
  };
}

export { DISPATCH_TTL_MS };
