import {
  getAuthSupabase,
  requireSameOrigin,
} from './human-auth-config.js';
import {
  activeSession,
  hashSessionToken,
  isRecentReauthentication,
  parseCookies,
  SESSION_COOKIE,
} from './human-session.js';

const SYNTHETIC_INVESTIGATION_CODE = 'A4-STAGE-001';
const ALLOWED_INVESTIGATORS = new Set([
  '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  '122483a9-5012-46ce-a328-5bdb08b4de01',
  '656726d1-8209-4240-8169-a7434074609d',
]);
const ALLOWED_ROUND_TYPES = new Set([
  'consulta', 'debate', 'replica', 'confrontacion', 'aclaracion', 'cierre',
]);

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function validationError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return req.body ? JSON.parse(req.body) : {};
    } catch {
      throw validationError('El cuerpo JSON no es válido.');
    }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        reject(validationError('El cuerpo supera el límite permitido.'));
        req.destroy?.();
      }
    });
    req.on('end', () => {
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('JSON body must be an object');
        }
        resolve(parsed);
      } catch {
        reject(validationError('El cuerpo JSON no es válido.'));
      }
    });
    req.on('error', reject);
  });
}

async function requireRecentHumanSession(req, supabase) {
  // Read the canonical session without touching last_seen_at: this endpoint performs no writes.
  const token = parseCookies(req.headers.cookie ?? '')[SESSION_COOKIE];
  if (!token) throw validationError('Se requiere una sesión humana autenticada.', 401);

  const { data: session, error } = await supabase
    .from('arkhe_human_sessions')
    .select('investigator_id, expires_at, revoked_at, reauthenticated_at')
    .eq('session_hash', hashSessionToken(token))
    .maybeSingle();

  if (error) throw error;
  if (!activeSession(session)) throw validationError('La sesión humana no está activa.', 401);
  if (!isRecentReauthentication({ reauthenticatedAt: session.reauthenticated_at })) {
    throw validationError('Se requiere una reautenticación WebAuthn de menos de diez minutos.', 401);
  }
  return session.investigator_id;
}

function validateInput(body) {
  const investigationCode = typeof body.investigacion_codigo === 'string'
    ? body.investigacion_codigo.trim().toUpperCase()
    : '';
  if (investigationCode !== SYNTHETIC_INVESTIGATION_CODE) {
    throw validationError('Este preflight sólo está habilitado para la investigación sintética A4-STAGE-001.');
  }

  const question = typeof body.pregunta === 'string' ? body.pregunta.trim() : '';
  if (!question || question.length > 4000) {
    throw validationError('La pregunta debe contener entre 1 y 4000 caracteres.');
  }

  const roundType = typeof body.tipo === 'string' ? body.tipo : '';
  if (!ALLOWED_ROUND_TYPES.has(roundType)) throw validationError('El tipo de ronda no es válido.');

  if (!Array.isArray(body.participantes) || body.participantes.length < 1 || body.participantes.length > 3) {
    throw validationError('Selecciona entre uno y tres investigadores.');
  }
  const participants = [...new Set(body.participantes)];
  if (
    participants.length !== body.participantes.length ||
    participants.some(id => typeof id !== 'string' || !ALLOWED_INVESTIGATORS.has(id))
  ) {
    throw validationError('La selección contiene un investigador no permitido o duplicado.');
  }

  let nodeId = null;
  if (body.nodo_id !== undefined && body.nodo_id !== null && body.nodo_id !== '') {
    const validShape = typeof body.nodo_id === 'number'
      ? Number.isSafeInteger(body.nodo_id)
      : typeof body.nodo_id === 'string' && /^[0-9]+$/.test(body.nodo_id);
    if (!validShape || !Number.isSafeInteger(Number(body.nodo_id)) || Number(body.nodo_id) <= 0) {
      throw validationError('El nodo ancla debe ser un entero positivo.');
    }
    nodeId = Number(body.nodo_id);
  }

  return { investigationCode, question, roundType, participants, nodeId };
}

function pushCheck(checks, key, label, status, detail) {
  checks.push({ key, label, status, detail });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { ok: false, error: 'Método no permitido.' });
  }

  try {
    requireSameOrigin(req);
    const supabase = getAuthSupabase();
    const humanId = await requireRecentHumanSession(req, supabase);
    if (humanId !== '2a003935-f248-442c-96fc-dcee29c4d41a') {
      throw validationError('Sólo el gobernador humano autorizado puede ejecutar este preflight.', 403);
    }

    const input = validateInput(await readBody(req));
    const checks = [];

    const { data: project, error: projectError } = await supabase
      .from('investigaciones_proyecto')
      .select('id, codigo, titulo, objetivo, estado')
      .eq('codigo', SYNTHETIC_INVESTIGATION_CODE)
      .maybeSingle();

    if (projectError) throw projectError;
    if (!project) {
      throw validationError('No se encontró A4-STAGE-001 en la base de datos aislada de Preview.', 404);
    }

    pushCheck(
      checks,
      'project_active',
      'Investigación',
      project.estado === 'activa' ? 'passed' : 'blocked',
      project.estado === 'activa'
        ? 'A4-STAGE-001 existe y está activa en el entorno sintético.'
        : 'El estado actual es "' + String(project.estado) + '". Para esta prueba, la investigación debe estar activa.'
    );

    const { data: participations, error: participationError } = await supabase
      .from('participaciones')
      .select('investigador_id, estado')
      .eq('investigacion_id', project.id)
      .in('investigador_id', input.participants);
    if (participationError) throw participationError;

    const { data: investigatorRows, error: investigatorError } = await supabase
      .from('investigadores')
      .select('id, nombre, tipo, estado')
      .in('id', input.participants);
    if (investigatorError) throw investigatorError;

    const participationById = new Map((participations ?? []).map(row => [row.investigador_id, row]));
    const investigatorById = new Map((investigatorRows ?? []).map(row => [row.id, row]));
    const investigators = input.participants.map(id => {
      const investigator = investigatorById.get(id);
      const participation = participationById.get(id);

      pushCheck(
        checks,
        'participation_' + id,
        'Participación · ' + (investigator?.nombre ?? id),
        participation?.estado === 'activo' ? 'passed' : 'blocked',
        participation?.estado === 'activo'
          ? 'La participación está activa en A4-STAGE-001.'
          : 'No existe una participación activa en A4-STAGE-001.'
      );

      let availabilityStatus = 'blocked';
      let availabilityDetail = 'No se encontró el registro del investigador.';
      if (investigator && investigator.tipo === 'ia' && investigator.estado === 'disponible') {
        availabilityStatus = 'passed';
        availabilityDetail = 'El investigador figura como disponible.';
      } else if (investigator && investigator.tipo === 'ia' && investigator.estado === 'ocupado') {
        availabilityStatus = 'warning';
        availabilityDetail = 'El investigador figura como ocupado. La decisión de continuar queda en manos de Ángel.';
      } else if (investigator) {
        availabilityDetail = 'El tipo o estado actual (' + String(investigator.tipo) + ' / ' + String(investigator.estado) + ') no permite marcarlo como disponible.';
      }
      pushCheck(
        checks,
        'availability_' + id,
        'Estado · ' + (investigator?.nombre ?? id),
        availabilityStatus,
        availabilityDetail
      );

      return {
        id,
        name: investigator?.nombre ?? 'Investigador desconocido',
        state: investigator?.estado ?? 'desconocido',
        participation_state: participation?.estado ?? 'no registrada',
      };
    });

    const { data: activeRounds, error: activeRoundsError } = await supabase
      .from('rondas_investigacion')
      .select('id, numero, tipo, estado, created_at')
      .eq('investigacion_id', project.id)
      .in('estado', ['abierta', 'pausada'])
      .order('created_at', { ascending: false })
      .limit(20);
    if (activeRoundsError) throw activeRoundsError;

    const rounds = activeRounds ?? [];
    pushCheck(
      checks,
      'active_rounds',
      'Rondas abiertas o pausadas',
      rounds.length ? 'warning' : 'passed',
      rounds.length
        ? 'Ya hay ' + rounds.length + ' ronda(s) abierta(s) o pausada(s). Revísalas para evitar duplicar trabajo; el preflight no toma esa decisión por ti.'
        : 'No hay rondas abiertas ni pausadas registradas para esta investigación.'
    );

    let anchorNode = null;
    if (input.nodeId === null) {
      pushCheck(checks, 'anchor_node', 'Nodo ancla', 'passed', 'No se seleccionó un nodo ancla.');
    } else {
      const { data: node, error: nodeError } = await supabase
        .from('investigaciones')
        .select('id, autor, contenido, tipo, estado')
        .eq('id', input.nodeId)
        .maybeSingle();
      if (nodeError) throw nodeError;

      let belongsToProject = false;
      if (node) {
        const { data: membership, error: nodeMembershipError } = await supabase
          .from('investigacion_nodos')
          .select('nodo_id')
          .eq('investigacion_id', project.id)
          .eq('nodo_id', input.nodeId)
          .maybeSingle();
        if (nodeMembershipError) throw nodeMembershipError;
        belongsToProject = Boolean(membership);
      }

      if (node && belongsToProject) {
        anchorNode = {
          id: node.id,
          author: node.autor,
          type: node.tipo,
          state: node.estado,
          excerpt: String(node.contenido ?? '').slice(0, 180),
        };
        pushCheck(checks, 'anchor_node', 'Nodo ancla', 'passed', 'El nodo existe y pertenece a A4-STAGE-001.');
      } else {
        pushCheck(checks, 'anchor_node', 'Nodo ancla', 'blocked', 'El nodo no existe o no pertenece a A4-STAGE-001.');
      }
    }

    const warnings = checks.filter(check => check.status === 'warning');
    const readyToCreate = checks.every(check => check.status !== 'blocked');
    const preflight = {
      version: 'arkhe-round-preflight-v0.1',
      mode: 'read-only',
      read_only: true,
      ready_to_create: readyToCreate,
      investigation: { code: project.codigo, title: project.titulo, state: project.estado },
      request: {
        round_type: input.roundType,
        question_length: input.question.length,
        participant_ids: input.participants,
        node_id: input.nodeId,
      },
      investigators,
      anchor_node: anchorNode,
      checks,
      warnings,
      active_rounds: rounds,
      side_effects: {
        rounds_created: 0,
        convocations_created: 0,
        dispatches_sent: 0,
        interventions_written: 0,
        semantic_writes: 0,
      },
    };

    return reply(res, 200, { ok: true, preflight });
  } catch (error) {
    if ((error?.status ?? 500) >= 500) console.error('[Arkhé round preflight] Read-only request failed.');
    return reply(res, error?.status ?? 500, {
      ok: false,
      error: error?.message ?? 'No fue posible completar el preflight.',
    });
  }
}
