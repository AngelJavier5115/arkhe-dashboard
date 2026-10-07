import { createHash, createPublicKey, verify } from 'node:crypto';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const SERVICE_TO_INVESTIGATOR = Object.freeze({
  atlas: '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  aletheia: '122483a9-5012-46ce-a328-5bdb08b4de01',
  tekton: '656726d1-8209-4240-8169-a7434074609d'
});

function canonicalBody(body) {
  return JSON.stringify(body ?? {});
}

export function buildSigningPayload({ serviceId, timestamp, nonce, body }) {
  const bodyHash = createHash('sha256').update(canonicalBody(body), 'utf8').digest('hex');
  return [serviceId, String(timestamp), nonce, bodyHash].join('.');
}

export function expectedInvestigatorForService(serviceId) {
  return SERVICE_TO_INVESTIGATOR[serviceId] ?? null;
}

export function verifyServiceSignature({ serviceId, timestamp, nonce, body, signature, publicKeyPem, now = Date.now() }) {
  if (!serviceId || !timestamp || !nonce || !signature || !publicKeyPem) return false;

  const numericTimestamp = Number(timestamp);
  if (!Number.isSafeInteger(numericTimestamp)) return false;
  if (Math.abs(now - numericTimestamp) > MAX_CLOCK_SKEW_MS) return false;

  const payload = buildSigningPayload({ serviceId, timestamp, nonce, body });
  const key = createPublicKey(publicKeyPem);

  return verify(
    null,
    Buffer.from(payload, 'utf8'),
    key,
    Buffer.from(signature, 'base64url')
  );
}

export { MAX_CLOCK_SKEW_MS };
