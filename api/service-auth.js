import { createHash, createPublicKey, verify } from 'node:crypto';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const SERVICE_CONFIG = Object.freeze({
  atlas: {
    investigadorId: '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
    publicKeyEnv: 'ARKHE_ATLAS_PUBLIC_KEY'
  },
  aletheia: {
    investigadorId: '122483a9-5012-46ce-a328-5bdb08b4de01',
    publicKeyEnv: 'ARKHE_ALETHEIA_PUBLIC_KEY'
  },
  tekton: {
    investigadorId: '656726d1-8209-4240-8169-a7434074609d',
    publicKeyEnv: 'ARKHE_TEKTON_PUBLIC_KEY'
  },
  // Tlacuilo is a separate executor identity delegated to one narrowly-scoped
  // proposal attributed to Atlas. It does not reuse Atlas's signing key.
  tlacuilo: {
    investigadorId: '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
    publicKeyEnv: 'ARKHE_TLACUILO_PUBLIC_KEY'
  }
});

function canonicalBody(body) {
  return JSON.stringify(body ?? {});
}

export function buildSigningPayload({ serviceId, timestamp, nonce, body }) {
  const bodyHash = createHash('sha256')
    .update(canonicalBody(body), 'utf8')
    .digest('hex');

  return [serviceId, String(timestamp), nonce, bodyHash].join('.');
}

export function expectedInvestigatorForService(serviceId) {
  return SERVICE_CONFIG[serviceId]?.investigadorId ?? null;
}

function getHeader(req, name) {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function verifyServiceSignature({
  serviceId,
  timestamp,
  nonce,
  body,
  signature,
  publicKeyPem,
  now = Date.now()
}) {
  if (!serviceId || !timestamp || !nonce || !signature || !publicKeyPem) {
    return false;
  }

  const numericTimestamp = Number(timestamp);
  if (!Number.isSafeInteger(numericTimestamp)) return false;
  if (Math.abs(now - numericTimestamp) > MAX_CLOCK_SKEW_MS) return false;

  const payload = buildSigningPayload({
    serviceId,
    timestamp,
    nonce,
    body
  });

  try {
    const key = createPublicKey(publicKeyPem);
    return verify(
      null,
      Buffer.from(payload, 'utf8'),
      key,
      Buffer.from(signature, 'base64url')
    );
  } catch {
    return false;
  }
}

export function authenticateServiceRequest(req, { now = Date.now() } = {}) {
  const serviceId = getHeader(req, 'x-arkhe-service-id');
  const timestamp = getHeader(req, 'x-arkhe-timestamp');
  const nonce = getHeader(req, 'x-arkhe-nonce');
  const signature = getHeader(req, 'x-arkhe-signature');

  const config = SERVICE_CONFIG[serviceId];
  if (!config) {
    const error = new Error('Servicio no reconocido.');
    error.status = 401;
    throw error;
  }

  const publicKeyPem = process.env[config.publicKeyEnv];
  if (!publicKeyPem) {
    const error = new Error(
      'Falta la clave pública de servicio para ' + serviceId + '.'
    );
    error.status = 503;
    throw error;
  }

  return {
    serviceId,
    investigadorId: config.investigadorId,
    timestamp: Number(timestamp),
    nonce,
    verified: verifyServiceSignature({
      serviceId,
      timestamp,
      nonce,
      body: req.__arkheSignedBody ?? {},
      signature,
      publicKeyPem,
      now
    })
  };
}

export { MAX_CLOCK_SKEW_MS };
