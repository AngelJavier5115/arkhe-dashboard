import { createHash, createPublicKey, verify } from 'node:crypto';

function bodyFromRequest(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const serviceId = req.headers?.['x-arkhe-service-id'];
  const timestamp = req.headers?.['x-arkhe-timestamp'];
  const nonce = req.headers?.['x-arkhe-nonce'];
  const signature = req.headers?.['x-arkhe-signature'];
  const body = bodyFromRequest(req);
  const canonicalBody = JSON.stringify(body ?? {});
  const bodyHash = createHash('sha256').update(canonicalBody, 'utf8').digest('hex');
  const payload = [serviceId, String(timestamp), nonce, bodyHash].join('.');
  const publicKeyPem = process.env.ARKHE_ATLAS_PUBLIC_KEY ?? '';
  const diagnostics = {
    serviceId,
    timestamp: Number(timestamp),
    nonce,
    bodyHash,
    payloadHash: createHash('sha256').update(payload, 'utf8').digest('hex'),
    publicKeyPresent: Boolean(publicKeyPem),
    publicKeyLength: publicKeyPem.length,
    signatureLength: String(signature ?? '').length,
    signatureBytes: Buffer.from(signature ?? '', 'base64url').length,
    signatureHash: createHash('sha256').update(Buffer.from(signature ?? '', 'base64url')).digest('hex'),
    localBodyIsObject: Boolean(req.body && typeof req.body === 'object')
  };

  try {
    const key = createPublicKey(publicKeyPem);
    diagnostics.publicKeyFingerprint = createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex');
    diagnostics.verified = verify(
      null,
      Buffer.from(payload, 'utf8'),
      key,
      Buffer.from(signature ?? '', 'base64url')
    );
  } catch (error) {
    diagnostics.verified = false;
    diagnostics.error = error instanceof Error ? error.message : String(error);
  }

  return res.status(200).json({ ok: true, diagnostics });
}
