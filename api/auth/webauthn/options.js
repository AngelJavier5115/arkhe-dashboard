import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getAuthSupabase, ANGEL_ID, WEBAUTHN_TTL_MS } from '../../human-auth-config.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Método no permitido.' });
    }

    requireSameOrigin(req);

    const supabase = getAuthSupabase();
    const { rpID } = await import('../../human-auth-config.js').then(mod => mod.getWebAuthnConfig());

    const { data: credentials, error } = await supabase
      .from('arkhe_human_credentials')
      .select('credential_id, transports')
      .eq('user_id', ANGEL_ID)
      .is('revoked_at', null);

    if (error) throw error;
    if (!credentials?.length) {
      return res.status(409).json({ ok: false, error: 'No existe ninguna credencial humana registrada.' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map(item => ({
        id: item.credential_id,
        transports: item.transports ?? undefined,
      })),
      userVerification: 'required',
    });

    const { error: challengeError } = await supabase
      .from('arkhe_webauthn_challenges')
      .insert({
        user_id: ANGEL_ID,
        challenge: options.challenge,
        purpose: 'authentication',
        expires_at: new Date(Date.now() + WEBAUTHN_TTL_MS).toISOString(),
      });

    if (challengeError) throw challengeError;

    return res.status(200).json(options);
  } catch (error) {
    console.error('[Arkhé human auth options]', error);
    return res.status(error?.status ?? 500).json({
      ok: false,
      error: error?.message ?? 'Error interno.',
    });
  }
}
