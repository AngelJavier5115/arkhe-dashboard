import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name =>
  fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('A4: WebAuthn endpoints use the investigator principal column', () => {
  const options = read('api/auth/webauthn/options.js');
  const verify = read('api/auth/webauthn/verify.js');
  const registerVerify = read('api/auth/webauthn/register-verify.js');

  assert.doesNotMatch(options, /user_id/);
  assert.match(options, /investigator_id/);
  assert.match(verify, /investigator_id/);
  assert.match(registerVerify, /investigator_id/);
});

test('A4: WebAuthn endpoints import every auth helper they invoke', () => {
  const options = read('api/auth/webauthn/options.js');
  const registerVerify = read('api/auth/webauthn/register-verify.js');

  assert.match(options, /requireSameOrigin/);
  assert.match(options, /getWebAuthnConfig/);
  assert.match(registerVerify, /requireSameOrigin/);
  assert.match(registerVerify, /isBootstrapAllowed/);
});
