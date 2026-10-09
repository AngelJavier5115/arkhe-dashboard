import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('A4 credential management: credential listing is session-bound and never exposes public keys', () => {
  const endpoint = read('api/auth/webauthn/credentials.js');
  assert.match(endpoint, /getHumanSession\(req, supabase\)/);
  assert.match(endpoint, /arkhe_human_credentials/);
  assert.match(endpoint, /select\('id, name, created_at, last_used_at, revoked_at'\)/);
  assert.doesNotMatch(endpoint, /select\([^)]*public_key/);
});

test('A4 credential management: revocation requires same-origin and recent WebAuthn reauthentication', () => {
  const endpoint = read('api/auth/webauthn/credentials.js');
  assert.match(endpoint, /requireSameOrigin\(req\)/);
  assert.match(endpoint, /isRecentReauthentication\(session\)/);
  assert.match(endpoint, /arkhe_revoke_human_credential/);
  assert.match(endpoint, /status\(401\)/);
});

test('A4 credential management: database serializes revocation and protects the last active credential', () => {
  const migration = read('supabase/migrations/20261009130000_guard_human_credential_revocation.sql');
  assert.match(migration, /for update/i);
  assert.match(migration, /select count\(\*\)/i);
  assert.match(migration, /active_count <= 1/i);
  assert.match(migration, /revoked_at is null/i);
  assert.match(migration, /grant execute .* to service_role/i);
});

test('A4 credential management: authenticated UI supports adding another passkey and revoking extra credentials', () => {
  const panel = read('src/HumanAuthPanel.jsx');
  assert.match(panel, /Registrar otra passkey/);
  assert.match(panel, /\/api\/auth\/webauthn\/credentials/);
  assert.match(panel, /Revocar/);
  assert.match(panel, /credential\.revoked_at/);
});
