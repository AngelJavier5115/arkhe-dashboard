import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { buildSigningPayload, expectedInvestigatorForService, verifyServiceSignature } from '../api/service-auth.js';

const ATLAS = '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f';
const TEKTON = '656726d1-8209-4240-8169-a7434074609d';

const atlasKeys = generateKeyPairSync('ed25519');
const tektonKeys = generateKeyPairSync('ed25519');
const publicKeyPem = atlasKeys.publicKey.export({ type: 'spki', format: 'pem' });
const privateKeyObject = atlasKeys.privateKey;

function signed({ serviceId = 'atlas', timestamp = Date.now(), nonce = 'nonce-a2', body = { action: 'completar_convocatoria' } } = {}) {
  const payload = buildSigningPayload({ serviceId, timestamp, nonce, body });
  return {
    serviceId,
    timestamp,
    nonce,
    body,
    signature: sign(null, Buffer.from(payload, 'utf8'), privateKeyObject).toString('base64url')
  };
}

test('hardening: a valid Atlas signature authenticates Atlas', () => {
  const request = signed();
  assert.equal(expectedInvestigatorForService(request.serviceId), ATLAS);
  assert.equal(verifyServiceSignature({ ...request, publicKeyPem }), true);
});

test('hardening: changing investigator claim does not change the authenticated service', () => {
  const request = signed({ body: { action: 'completar_convocatoria', investigador_id: TEKTON } });
  assert.equal(expectedInvestigatorForService(request.serviceId), ATLAS);
  assert.notEqual(expectedInvestigatorForService(request.serviceId), request.body.investigador_id);
  assert.equal(verifyServiceSignature({ ...request, publicKeyPem }), true);
});

test('hardening: forged signature fails', () => {
  const request = signed();
  request.signature = sign(null, Buffer.from('wrong payload'), privateKeyObject).toString('base64url');
  assert.equal(verifyServiceSignature({ ...request, publicKeyPem }), false);
});

test('hardening: cross-service claim fails without Tekton private key', () => {
  const request = signed({ serviceId: 'tekton' });
  const tektonSignature = sign(null, Buffer.from(buildSigningPayload(request), 'utf8'), tektonKeys.privateKey).toString('base64url');
  assert.equal(expectedInvestigatorForService(request.serviceId), TEKTON);
  assert.equal(verifyServiceSignature({ ...request, signature: tektonSignature, publicKeyPem }), false);
});

test('hardening: stale signed request fails freshness check', () => {
  const timestamp = Date.now() - (10 * 60 * 1000);
  const request = signed({ timestamp });
  assert.equal(verifyServiceSignature({ ...request, publicKeyPem, now: Date.now() }), false);
});

test('hardening: body mutation invalidates signature', () => {
  const request = signed();
  request.body = { action: 'completar_convocatoria', investigador_id: TEKTON };
  assert.equal(verifyServiceSignature({ ...request, publicKeyPem }), false);
});
