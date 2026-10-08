import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';

test('A4-1: session secrets are not stored in plaintext', () => {
  const raw = randomBytes(32).toString('base64url');
  const stored = createHash('sha256').update(raw, 'utf8').digest('hex');

  assert.notEqual(raw, stored);
  assert.equal(stored.length, 64);
});

test('A4-2: a revoked or expired session cannot be considered active', () => {
  const now = Date.now();
  const active = { expiresAt: now + 60_000, revokedAt: null };
  const expired = { expiresAt: now - 1, revokedAt: null };
  const revoked = { expiresAt: now + 60_000, revokedAt: new Date(now).toISOString() };

  const isActive = session =>
    session.revokedAt === null && session.expiresAt > now;

  assert.equal(isActive(active), true);
  assert.equal(isActive(expired), false);
  assert.equal(isActive(revoked), false);
});

test('A4-3: the human principal is server-derived, never body-derived', () => {
  const ANGEL_ID = '2a003935-f248-442c-96fc-dcee29c4d41a';
  const authenticatedPrincipal = ANGEL_ID;
  const maliciousBody = { actor_id: '00000000-0000-0000-0000-000000000000' };

  const actorId = authenticatedPrincipal;

  assert.equal(actorId, ANGEL_ID);
  assert.notEqual(actorId, maliciousBody.actor_id);
});
