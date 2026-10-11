import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANGEL_ID,
  SESSION_COOKIE,
  randomSessionToken,
  hashSessionToken,
  activeSession,
  buildSessionCookie,
  buildClearedSessionCookie,
} from '../api/human-session.js';

test('session token is random and stored only as a hash', () => {
  const token = randomSessionToken();
  const hash = hashSessionToken(token);

  assert.ok(token.length >= 32);
  assert.notEqual(token, hash);
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test('only an unrevoked, unexpired canonical human session is active', () => {
  const now = Date.now();

  assert.equal(activeSession({
    investigator_id: ANGEL_ID,
    expires_at: new Date(now + 60_000).toISOString(),
    revoked_at: null,
  }, now), true);

  assert.equal(activeSession({
    investigator_id: ANGEL_ID,
    expires_at: new Date(now - 1).toISOString(),
    revoked_at: null,
  }, now), false);

  assert.equal(activeSession({
    investigator_id: ANGEL_ID,
    expires_at: new Date(now + 60_000).toISOString(),
    revoked_at: new Date(now).toISOString(),
  }, now), false);

  assert.equal(activeSession({
    investigator_id: '00000000-0000-0000-0000-000000000000',
    expires_at: new Date(now + 60_000).toISOString(),
    revoked_at: null,
  }, now), false);
});

test('session cookie has the required browser boundary', () => {
  const cookie = buildSessionCookie('opaque-token');

  assert.ok(cookie.startsWith(SESSION_COOKIE + '='));
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=28800/);
});

test('cleared session cookie expires immediately', () => {
  assert.match(buildClearedSessionCookie(), /Max-Age=0/);
});
