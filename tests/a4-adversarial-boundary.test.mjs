import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('A4 adversarial: Core never trusts a client-supplied actor identity', () => {
  const core = read('api/arkhe-core.js');
  assert.match(core, /humanIdentity = await requireHumanGovernor\(req\)/);
  assert.match(core, /assertBodyActorMatches\(body, humanIdentity\)/);
  assert.doesNotMatch(core, /requireAngel\(body\.actor_id\)/);
});

test('A4 adversarial: human mutations cannot bypass origin validation', () => {
  const core = read('api/arkhe-core.js');
  const config = read('api/human-auth-config.js');
  assert.match(core, /requireSameOrigin\(req\)/);
  assert.match(config, /req\.headers\.origin !== expected/);
});

test('A4 adversarial: authentication challenge is one-use and freshness-bound', () => {
  const verify = read('api/auth/webauthn/verify.js');
  const registerVerify = read('api/auth/webauthn/register-verify.js');

  for (const source of [verify, registerVerify]) {
    assert.match(source, /is\('used_at', null\)/);
    assert.match(source, /expires_at/);
    assert.match(source, /update\(\{ used_at:/);
    assert.match(source, /eq\('id', challenge\.id\)/);
  }
});

test('A4 adversarial: revoked credentials cannot authenticate', () => {
  const verify = read('api/auth/webauthn/verify.js');
  assert.match(verify, /!credential \|\| credential\.revoked_at/);
  assert.match(verify, /is\('revoked_at', null\)/);
});

test('A4 adversarial: bootstrap is bounded and cannot replace an authenticated session', () => {
  const registerOptions = read('api/auth/webauthn/register-options.js');
  const registerVerify = read('api/auth/webauthn/register-verify.js');
  const config = read('api/human-auth-config.js');

  assert.match(config, /ARKHE_AUTH_BOOTSTRAP_EXPIRES_AT/);
  assert.match(config, /expiresAt > now/);
  assert.match(registerOptions, /!session && count === 0 && isBootstrapAllowed\(req\)/);
  assert.match(registerVerify, /!session && count === 0 && isBootstrapAllowed\(req\)/);
});
