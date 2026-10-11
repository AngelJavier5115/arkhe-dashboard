import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('A4 adversarial: Core never trusts a client-supplied actor identity', () => {
  const core = read('api/arkhe-core.js');
  assert.match(core, /humanIdentity = await requireHumanGovernor\(req, \{ requireRecentReauth: true \}\)/);
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
    assert.match(source, /reserveChallengeAttempt\(supabase, challenge\.id\)/);
    assert.match(source, /arkhe_webauthn_reserve_attempt/);
    assert.match(source, /update\(\{ used_at:/);
    assert.match(source, /eq\('id', id\)/);
  }
});

test('A4 adversarial: challenge issuance is throttled and attempts are bounded', () => {
  const activeChallengeMigration = read('supabase/migrations/20261008151000_one_active_webauthn_challenge.sql');
  const attemptMigration = read('supabase/migrations/20261008152000_bound_webauthn_attempts.sql');
  const authOptions = read('api/auth/webauthn/options.js');
  const registerOptions = read('api/auth/webauthn/register-options.js');

  assert.match(activeChallengeMigration, /arkhe_webauthn_one_active_challenge_idx/);
  assert.match(attemptMigration, /arkhe_webauthn_reserve_attempt/);
  assert.match(attemptMigration, /attempts integer not null default 0/);
  assert.match(authOptions, /status\(429\)/);
  assert.match(registerOptions, /status\(429\)/);
});

test('A4 adversarial: human auth schema aligns its principal column', () => {
  const initialMigration = read('supabase/migrations/20261008130000_create_human_auth_tables.sql');
  const alignmentMigration = read('supabase/migrations/20261008150000_align_human_auth_principal.sql');

  assert.match(initialMigration, /user_id/);
  assert.match(alignmentMigration, /rename column user_id to investigator_id/i);
});

test('A4 adversarial: privileged actions require recent human reauthentication', () => {
  const session = read('api/human-session.js');
  const core = read('api/arkhe-core.js');
  const registerOptions = read('api/auth/webauthn/register-options.js');
  const registerVerify = read('api/auth/webauthn/register-verify.js');

  assert.match(session, /HUMAN_REAUTH_TTL_SECONDS = 600/);
  assert.match(core, /requireHumanGovernor\(req, \{ requireRecentReauth: true \}\)/);
  assert.match(core, /isRecentReauthentication\(session\)/);
  assert.match(registerOptions, /isRecentReauthentication\(session\)/);
  assert.match(registerVerify, /isRecentReauthentication\(session\)/);
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
