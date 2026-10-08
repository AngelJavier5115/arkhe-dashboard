import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getAuthSupabase, getWebAuthnConfig, requireSameOrigin, isBootstrapAllowed, ANGEL_ID, WEBAUTHN_TTL_MS } from '../../human-auth-config.js';
import { getHumanSession } from '../../human-session.js';


export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Método no permitido.' });
    }

    requireSameOrigin(req);

    const supabase = getAuthSupabase();
    const session = await getHumanSession(req, supabase);

    const { count, error: countError } = await supabase
      .from('arkhe_human_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('investigator_id', ANGEL_ID);

    if (countError) throw countError;

    const initialBootstrap = !session && count === 0 && isBootstrapAllowed(req);
    if (!session && !initialBootstrap) {
      return res.status(401).json({ ok: false, error: 'Se requiere una sesión humana válida o el bootstrap inicial controlado.' });
    }

    const { rpID, rpName } = getWebAuthnConfig();

    await supabase
      .from('arkhe_webauthn_challenges')
      .delete()
      .eq('investigator_id', ANGEL_ID)
      .eq('purpose', 'registration')
      .is('used_at', null)
      .lt('expires_at', new Date().toISOString());

    const { data: credentials, error } = await supabase
      .from('arkhe_human_credentials')
      .select('credential_id, transports')
      .eq('investigator_id', ANGEL_ID)
      .is('revoked_at', null);

    if (error) throw error;

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(ANGEL_ID),
      userName: 'Angel / Arkhé',
      userDisplayName: 'Ángel',
      attestationType: 'none',
      excludeCredentials: (credentials ?? []).map(item => ({
        id: item.credential_id,
        transports: item.transports ?? undefined,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    const { error: challengeError } = await supabase
      .from('arkhe_webauthn_challenges')
      .insert({
        investigator_id: ANGEL_ID,
        challenge: options.challenge,
        purpose: 'registration',
        expires_at: new Date(Date.now() + WEBAUTHN_TTL_MS).toISOString(),
      });

    if (challengeError) {
      if (challengeError.code === '23505') {
        res.setHeader('Retry-After', String(Math.ceil(WEBAUTHN_TTL_MS / 1000)));
        return res.status(429).json({ ok: false, error: 'Ya existe un challenge de registro activo.' });
      }
      throw challengeError;
    }

    return res.status(200).json({
      ...options,
      bootstrap: initialBootstrap,
    });
  } catch (error) {
    console.error('[Arkhé human registration options]', error);
    return res.status(error?.status ?? 500).json({
      ok: false,
      error: error?.message ?? 'Error interno.',
    });
  }
}
