import crypto from 'node:crypto';

export const ANGEL_ID = '2a003935-f248-442c-96fc-dcee29c4d41a';
export const SESSION_COOKIE = '__Host-arkhe-session';
export const SESSION_TTL_SECONDS = 28800;

export function randomSessionToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function activeSession(row, now = Date.now()) {
  return Boolean(
    row &&
    !row.revoked_at &&
    Number.isFinite(Date.parse(row.expires_at)) &&
    Date.parse(row.expires_at) > now &&
    row.investigator_id === ANGEL_ID
  );
}

export function buildSessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return [
    SESSION_COOKIE + '=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Max-Age=' + Math.max(0, Math.floor(maxAge)),
  ].join('; ');
}

export function buildClearedSessionCookie() {
  return [
    SESSION_COOKIE + '=',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Max-Age=0',
  ].join('; ');
}
