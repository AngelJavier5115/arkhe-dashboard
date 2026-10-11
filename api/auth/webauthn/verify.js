import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getAuthSupabase, getWebAuthnConfig, requireSameOrigin, ANGEL_ID } from '../../human-auth-config.js';
import { createHumanSession, buildSessionCookie } from '../../human-session.js';

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
    .eq('purpose', 'authentication')
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

async function reserveChallengeAttempt(supabase, id) {
  const { data, error } = await supabase.rpc('arkhe_webauthn_reserve_attempt', {
    p_challenge_id: id,
    p_max_attempts: 5,
  });

  if (error) throw error;
  if (!data) {
    const limited = new Error('Límite de intentos alcanzado para este challenge.');
    limited.status = 429;
    throw limited;
  }
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

    requireSameOrigin(req);

    const response = req.body;
    if (!response?.id || !response?.response) {
      return res.status(400).json({ ok: false, error: 'Respuesta WebAuthn incompleta.' });
    }

    const supabase = getAuthSupabase();
    const { rpID, origin } = getWebAuthnConfig();
    const clientData = decodeClientData(response);
    const challenge = await findUnusedChallenge(supabase, clientData.challenge);
    await reserveChallengeAttempt(supabase, challenge.id);

    const { data: credential, error: credentialError } = await supabase
      .from('arkhe_human_credentials')
      .select('id, credential_id, public_key, counter, transports, revoked_at')
      .eq('credential_id', response.id)
      .eq('investigator_id', ANGEL_ID)
      .maybeSingle();

    if (credentialError) throw credentialError;

    if (!credential || credential.revoked_at) {
      return res.status(401).json({ ok: false, error: 'Credencial no registrada o revocada.' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: credential.credential_id,
        publicKey: new Uint8Array(Buffer.from(credential.public_key, 'base64')),
        counter: Number(credential.counter),
        transports: credential.transports ?? undefined,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ ok: false, error: 'Autenticación WebAuthn no verificada.' });
    }

    await consumeChallenge(supabase, challenge.id);

    const { error: counterError } = await supabase
      .from('arkhe_human_credentials')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', credential.id)
      .eq('investigator_id', ANGEL_ID)
      .is('revoked_at', null);

    if (counterError) throw counterError;

    const session = await createHumanSession(supabase);
    res.setHeader('Set-Cookie', buildSessionCookie(session.token));
    return res.status(200).json({
      ok: true,
      authenticated: true,
      investigator_id: ANGEL_ID,
      expires_at: session.expiresAt,
    });
  } catch (error) {
    console.error('[Arkhé human auth verify]', error);
    return res.status(error?.status ?? 500).json({
      ok: false,
      error: error?.message ?? 'Error interno.',
    });
  }
}
