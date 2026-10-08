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

export function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf('=');
        return index < 0
          ? [part, '']
          : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
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

export async function createHumanSession(supabase) {
  const token = randomSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  const { error } = await supabase
    .from('arkhe_human_sessions')
    .insert({
      session_hash: hashSessionToken(token),
      investigator_id: ANGEL_ID,
      expires_at: expiresAt,
    });

  if (error) throw error;

  return { token, expiresAt };
}

export async function getHumanSession(req, supabase) {
  const cookies = parseCookies(req.headers.cookie ?? '');
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const { data, error } = await supabase
    .from('arkhe_human_sessions')
    .select('id, investigator_id, expires_at, revoked_at')
    .eq('session_hash', hashSessionToken(token))
    .maybeSingle();

  if (error) throw error;
  if (!activeSession(data)) return null;

  await supabase
    .from('arkhe_human_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.id)
    .eq('investigator_id', ANGEL_ID)
    .is('revoked_at', null);

  return {
    id: data.id,
    investigatorId: ANGEL_ID,
    expiresAt: data.expires_at,
  };
}

export async function revokeHumanSession(req, supabase) {
  const cookies = parseCookies(req.headers.cookie ?? '');
  const token = cookies[SESSION_COOKIE];
  if (!token) return;

  await supabase
    .from('arkhe_human_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('session_hash', hashSessionToken(token))
    .eq('investigator_id', ANGEL_ID)
    .is('revoked_at', null);
}
