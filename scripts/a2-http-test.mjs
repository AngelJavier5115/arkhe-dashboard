import { readFileSync } from 'node:fs';
import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const endpoint = 'https://arkhe-dashboard-git-audit-a2-provenance-boundary-arkhe7.vercel.app/api/arkhe-core';
const body = {
  action: 'obtener_convocatoria',
  convocatoria_id: 'e987b121-f4b2-41f0-8528-48cced2ccf1e'
};
const serviceId = 'atlas';
const timestamp = String(Date.now());
const nonce = randomUUID();
const canonicalBody = JSON.stringify(body);
const bodyHash = createHash('sha256').update(canonicalBody, 'utf8').digest('hex');
const payload = [serviceId, timestamp, nonce, bodyHash].join('.');
const privateKey = createPrivateKey(readFileSync('atlas-a2-temp-private.pem'));
const signature = sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64url');

console.log('A2 HTTP test: petición firmada Atlas');
console.log('nonce:', nonce);
console.log('timestamp:', timestamp);

const args = [
  'vercel@latest', 'curl', endpoint,
  '-X', 'POST',
  '-H', 'Content-Type: application/json',
  '-H', `x-arkhe-service-id: ${serviceId}`,
  '-H', `x-arkhe-timestamp: ${timestamp}`,
  '-H', `x-arkhe-nonce: ${nonce}`,
  '-H', `x-arkhe-signature: ${signature}`,
  '-d', canonicalBody
];

const result = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
