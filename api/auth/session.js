import { getAuthSupabase, requireSameOrigin } from '../human-auth-config.js';
import {
  getHumanSession,
  revokeHumanSession,
  buildClearedSessionCookie,
} from '../human-session.js';

export default async function handler(req, res) {
  try {
    const supabase = getAuthSupabase();

    if (req.method === 'GET') {
      const session = await getHumanSession(req, supabase);
      return res.status(200).json({
        ok: true,
        authenticated: Boolean(session),
        ...(session ? {
          investigator_id: session.investigatorId,
          expires_at: session.expiresAt,
        } : {}),
      });
    }

    if (req.method === 'POST') {
      requireSameOrigin(req);
      await revokeHumanSession(req, supabase);
      res.setHeader('Set-Cookie', buildClearedSessionCookie());
      return res.status(200).json({ ok: true, logged_out: true });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  } catch (error) {
    console.error('[Arkhé human session]', error);
    return res.status(error?.status ?? 500).json({
      ok: false,
      error: error?.message ?? 'Error interno.',
    });
  }
}
