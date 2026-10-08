import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getAuthSupabase, getWebAuthnConfig, ANGEL_ID } from '../../human-auth-config.js';
import { getHumanSession } from '../../human-session.js';

function bootstrapAllowed(req) {
  const expected = process.env.ARKHE_AUTH_BOOTSTRAP_SECRET;
  const provided = req.headers['x-arkhe-bootstrap'];
  return Boolean(expected && provided && provided === expected);
}

function decodeClientData(response) {
  try {
    return JSON.parse(
      Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf8')
    );
  } catch {
    const error = new Error('clientDataJSON inválido.');
    error.status = 400;
    throw error;
  }
}

async function findUnusedChallenge(supabase, challenge) {
  const { data, error } = await supabase
    .from('arkhe_webauthn_challenges')
    .select('id, challenge, expires_at')
    .eq('challenge', challenge)
    .eq('purpose', 'registration')
    .eq('investigator_id', ANGEL_ID)
    .is('used_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data || Date.parse(data.expires_at) <= Date.now()) {
    const invalid = new Error('Challenge inválido o expirado.');
    invalid.status = 401;
    throw invalid;
  }

  return data;
}

async function consumeChallenge(supabase, id) {
  const { data, error } = await supabase
    .from('arkhe_webauthn_challenges')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
    .is('used_at', null)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const replay = new Error('Challenge ya utilizado.');
    replay.status = 401;
    throw replay;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Método no permitido.' });
    }

    const response = req.body;
    if (!response?.id || !response?.response) {
      return res.status(400).json({ ok: false, error: 'Respuesta WebAuthn incompleta.' });
    }

    const supabase = getAuthSupabase();
    const session = await getHumanSession(req, supabase);

    const { count, error: countError } = await supabase
      .from('arkhe_human_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('investigator_id', ANGEL_ID)
      .is('revoked_at', null);

    if (countError) throw countError;

    const initialBootstrap = !session && count === 0 && bootstrapAllowed(req);
    if (!session && !initialBootstrap) {
      return res.status(401).json({ ok: false, error: 'Se requiere sesión humana o bootstrap inicial controlado.' });
    }

    const clientData = decodeClientData(response);
    const challenge = await findUnusedChallenge(supabase, clientData.challenge);
    const { rpID, origin } = getWebAuthnConfig();

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      supportedAlgorithmIDs: [-7, -257],
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(401).json({ ok: false, error: 'Registro WebAuthn no verificado.' });
    }

    await consumeChallenge(supabase, challenge.id);

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const { error: insertError } = await supabase
      .from('arkhe_human_credentials')
      .insert({
        investigator_id: ANGEL_ID,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
        transports: credential.transports ?? response.response.transports ?? [],
        name: initialBootstrap ? 'Principal' : 'Credencial adicional',
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ ok: false, error: 'La credencial ya está registrada.' });
      }
      throw insertError;
    }

    return res.status(201).json({
      ok: true,
      registered: true,
      credential_id: credential.id,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      bootstrap: initialBootstrap,
    });
  } catch (error) {
    console.error('[Arkhé human registration verify]', error);
    return res.status(error?.status ?? 500).json({
      ok: false,
      error: error?.message ?? 'Error interno.',
    });
  }
}
