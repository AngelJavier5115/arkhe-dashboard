import { getAuthSupabase, requireSameOrigin, ANGEL_ID } from '../../human-auth-config.js';
import { getHumanSession, isRecentReauthentication } from '../../human-session.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Método no permitido.' });
    }

    const supabase = getAuthSupabase();
    const session = await getHumanSession(req, supabase);
    if (!session) {
      return res.status(401).json({ ok: false, error: 'Se requiere una sesión humana autenticada.' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('arkhe_human_credentials')
        .select('id, name, created_at, last_used_at, revoked_at')
        .eq('investigator_id', ANGEL_ID)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return res.status(200).json({
        ok: true,
        credentials: data ?? [],
      });
    }

    requireSameOrigin(req);

    if (!isRecentReauthentication(session)) {
      return res.status(401).json({
        ok: false,
        error: 'Reautentícate con tu passkey antes de revocar una credencial.',
      });
    }

    const credentialId = req.body?.credential_id;
    if (typeof credentialId !== 'string' || !UUID_PATTERN.test(credentialId)) {
      return res.status(400).json({ ok: false, error: 'Identificador de credencial inválido.' });
    }

    const { data: revoked, error } = await supabase.rpc('arkhe_revoke_human_credential', {
      p_credential_id: credentialId,
    });

    if (error) throw error;
    if (!revoked) {
      return res.status(409).json({
        ok: false,
        error: 'No se revocó la credencial. Debe existir otra credencial activa y la seleccionada debe seguir activa.',
      });
    }

    return res.status(200).json({ ok: true, revoked: true });
  } catch (error) {
    console.error('[Arkhé WebAuthn credentials]', error);
    return res.status(error?.status ?? 500).json({
      ok: false,
      error: error?.message ?? 'Error interno.',
    });
  }
}
