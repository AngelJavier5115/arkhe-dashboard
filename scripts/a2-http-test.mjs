import { readFileSync } from 'node:fs';
import { createHash, createPrivateKey, createPublicKey, randomUUID, sign, verify } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const endpoint = 'https://arkhe-dashboard-git-audit-a2-provenance-boundary-arkhe7.vercel.app/api/arkhe-core';
const convocatoriaId = 'e987b121-f4b2-41f0-8528-48cced2ccf1e';
const privateKey = createPrivateKey(readFileSync('atlas-a2-clean-private.pem'));

function makeRequest({ serviceId = 'atlas', signedBody, sentBody = signedBody, nonce = randomUUID() }) {
  const timestamp = String(Date.now());
  const canonicalSignedBody = JSON.stringify(signedBody);
  const bodyHash = createHash('sha256').update(canonicalSignedBody, 'utf8').digest('hex');
  const payload = [serviceId, timestamp, nonce, bodyHash].join('.');
  const payloadBuffer = Buffer.from(payload, 'utf8');
  const signatureBuffer = sign(null, payloadBuffer, privateKey);
  const localVerification = verify(
    null,
    payloadBuffer,
    createPublicKey(privateKey),
    signatureBuffer
  );
  if (!localVerification) throw new Error('Firma local inválida');

  const args = [
    'vercel@latest', 'curl', endpoint,
    '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-H', `x-arkhe-service-id: ${serviceId}`,
    '-H', `x-arkhe-timestamp: ${timestamp}`,
    '-H', `x-arkhe-nonce: ${nonce}`,
    '-H', `x-arkhe-signature: ${signatureBuffer.toString('base64url')}`,
    '-d', JSON.stringify(sentBody)
  ];

  return { args, nonce, result: spawnSync('npx', args, { encoding: 'utf8' }) };
}

function summarize(label, result, expected) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const passed = output.includes(expected);
  console.log(`${passed ? 'PASS' : 'FAIL'} | ${label}`);
  if (!passed) {
    console.log(output.slice(-2500));
  }
  return passed;
}

const validBody = {
  action: 'obtener_convocatoria',
  convocatoria_id: convocatoriaId
};

console.log('A2 adversarial HTTP suite');

const first = makeRequest({ signedBody: validBody });
summarize('1. Atlas válido → Core acepta', first.result, '"ok":true');

const tampered = makeRequest({
  signedBody: validBody,
  sentBody: { ...validBody, convocatoria_id: '00000000-0000-0000-0000-000000000000' }
});
summarize('2. Cuerpo alterado → firma rechazada', tampered.result, 'Firma de servicio inválida');

const crossService = makeRequest({
  serviceId: 'aletheia',
  signedBody: validBody
});
summarize('3. Atlas intentando presentarse como Aletheia → rechazado', crossService.result, 'Firma de servicio inválida');

const replayNonce = randomUUID();
const replayFirst = makeRequest({ signedBody: validBody, nonce: replayNonce });
summarize('4a. Primera petición con nonce → aceptada', replayFirst.result, '"ok":true');

const replaySecond = makeRequest({ signedBody: validBody, nonce: replayNonce });
summarize('4b. Repetición del mismo nonce → replay rechazado', replaySecond.result, 'Nonce ya utilizado');

console.log('Suite terminada.');
