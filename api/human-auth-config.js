import { createClient } from '@supabase/supabase-js';

export const ANGEL_ID = '2a003935-f248-442c-96fc-dcee29c4d41a';
export const WEBAUTHN_TTL_MS = 5 * 60 * 1000;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(name + ' no está configurado.');
  return value;
}

export function getAuthSupabase() {
  return createClient(
    requiredEnv('VITE_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export function requireSameOrigin(req) {
  const expected = getWebAuthnConfig().origin;
  if (req.headers.origin !== expected) { const error = new Error('Origen no autorizado.'); error.status = 403; throw error; }
}

export function getWebAuthnConfig() {
  return {
    rpID: requiredEnv('ARKHE_AUTH_RP_ID'),
    origin: requiredEnv('ARKHE_AUTH_ORIGIN'),
    rpName: process.env.ARKHE_AUTH_RP_NAME ?? 'Arkhé',
  };
}
