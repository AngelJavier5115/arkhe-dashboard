import { getAuthSupabase, requireSameOrigin } from './human-auth-config.js';
import { getHumanSession } from './human-session.js';
import {
  authenticateSemanticActor,
  buildRelationProvenance,
  httpError,
  rejectClientIdentityClaims,
  validateCreateRelationBody,
  validateReviewRelationBody,
  TLACUILO_SMOKE_POLICY,
} from './semantic-relations-logic.js';

const MAX_BODY_BYTES = 24 * 1024;
const ANGEL_ID = '2a003935-f248-442c-96fc-dcee29c4d41a';

function getConfiguredSupabase() {
  try {
    return getAuthSupabase();
  } catch (error) {
    if (!error.status && /no está configurado/.test(String(error.message ?? ''))) error.status = 503;
    throw error;
  }
}

function requireConfiguredSameOrigin(req) {
  try {
    return requireSameOrigin(req);
  } catch (error) {
    if (!error.status && /no está configurado/.test(String(error.message ?? ''))) error.status = 503;
    throw error;
  }
}

function response(res, status, value) {
  return res.status(status).json(value);
}

function header(req, name) {
  const headers = req.headers ?? {};
  const key = Object.keys(headers).find(item => item.toLowerCase() === name.toLowerCase());
  const value = key ? headers[key] : undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parseBodyObject(req) {
  const raw = req.body;
  if (raw !== undefined && raw !== null && typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    const bytes = Buffer.byteLength(JSON.stringify(raw), 'utf8');
    if (bytes > MAX_BODY_BYTES) throw httpError('La petición supera el límite de tamaño permitido.', 413);
    if (Array.isArray(raw)) throw httpError('El cuerpo debe ser un objeto JSON.', 400);
    return raw;
  }

  const content = Buffer.isBuffer(raw) ? raw.toString('utf8') : typeof raw === 'string' ? raw : '';
  if (Buffer.byteLength(content, 'utf8') > MAX_BODY_BYTES) {
    throw httpError('La petición supera el límite de tamaño permitido.', 413);
  }
  if (!content.trim()) throw httpError('Se requiere un cuerpo JSON.', 400);
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw httpError('El cuerpo JSON está mal formado.', 400);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw httpError('El cuerpo debe ser un objeto JSON.', 400);
  }
  return parsed;
}

async function reserveWrite(supabase, actor) {
  const { data, error } = await supabase.rpc('arkhe_reserve_semantic_write', {
    p_actor_investigator_id: actor.investigatorId,
    p_actor_kind: actor.kind,
  });
  if (error) throw error;
  if (data !== true) throw httpError('Se alcanzó el límite temporal de escrituras para este actor. Inténtalo más tarde.', 429);
}

async function enforceTlacuiloPreconditions(supabase) {
  const policy = TLACUILO_SMOKE_POLICY;
  const { data: nodes, error: nodesError } = await supabase
    .from('investigaciones')
    .select('id, contenido')
    .in('id', [policy.sourceNodeId, policy.targetNodeId]);

  if (nodesError || !Array.isArray(nodes) || nodes.length !== 2) {
    throw httpError('Tlacuilo no pudo verificar los dos nodos aprobados; no se escribió ninguna relación.', 409);
  }

  const nodeMap = new Map(nodes.map(node => [Number(node.id), node]));
  if (
    nodeMap.get(policy.sourceNodeId)?.contenido !== policy.sourceNodeText ||
    nodeMap.get(policy.targetNodeId)?.contenido !== policy.targetNodeText
  ) {
    throw httpError('El contenido actual de los nodos aprobados cambió; Tlacuilo se detiene sin escribir.', 409);
  }

  const [forward, reverse] = await Promise.all([
    supabase.from('arkhe_semantic_relations')
      .select('id')
      .eq('source_node_id', policy.sourceNodeId)
      .eq('target_node_id', policy.targetNodeId)
      .limit(1),
    supabase.from('arkhe_semantic_relations')
      .select('id')
      .eq('source_node_id', policy.targetNodeId)
      .eq('target_node_id', policy.sourceNodeId)
      .limit(1),
  ]);

  if (forward.error || reverse.error || !Array.isArray(forward.data) || !Array.isArray(reverse.data)) {
    throw httpError('Tlacuilo no pudo comprobar que no existe una relación previa; no se escribió ninguna relación.', 503);
  }
  if (forward.data.length > 0 || reverse.data.length > 0) {
    throw httpError('Ya existe una relación entre los nodos aprobados; la política de Tlacuilo se detiene sin duplicarla.', 409);
  }
}

function mapDatabaseError(error) {
  if (error?.status) return error;
  if (['23503', '23514', '23502', '22P02', '22001', 'P0001'].includes(error?.code)) {
    return httpError('La base de datos rechazó la relación o revisión por sus reglas de integridad.', 400);
  }
  if (error?.code === '23505') {
    return httpError('La operación encontró una restricción de unicidad (nonce repetido o política de uso único ya consumida); no reintentes automáticamente.', 409);
  }
  return httpError('No fue posible completar la operación de relaciones semánticas.', 500);
}

export function createSemanticRelationsHandler(dependencies = {}) {
  const deps = {
    getSupabase: dependencies.getSupabase ?? getConfiguredSupabase,
    getHumanSession: dependencies.getHumanSession ?? getHumanSession,
    requireSameOrigin: dependencies.requireSameOrigin ?? requireConfiguredSameOrigin,
    now: dependencies.now ?? (() => Date.now()),
  };

  return async function semanticRelationsHandler(req, res) {
    res.setHeader?.('Cache-Control', 'no-store');
    res.setHeader?.('X-Content-Type-Options', 'nosniff');

    if (req.method !== 'POST') {
      res.setHeader?.('Allow', 'POST');
      return response(res, 405, { ok: false, error: 'Método no permitido.' });
    }

    const contentType = String(header(req, 'content-type') ?? '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return response(res, 415, { ok: false, error: 'Content-Type debe ser application/json.' });
    }

    try {
      const body = parseBodyObject(req);
      rejectClientIdentityClaims(body);

      if (!['create', 'review'].includes(body.action)) {
        throw httpError('Acción desconocida. Usa create o review.', 400);
      }

      // Use the server-only Supabase key. If unavailable, this fails closed.
      const supabase = deps.getSupabase();
      const actor = await authenticateSemanticActor(req, body, {
        supabase,
        getHumanSession: deps.getHumanSession,
        requireSameOrigin: deps.requireSameOrigin,
        now: deps.now(),
      });

      if (body.action === 'create') {
        const input = validateCreateRelationBody(body, actor);
        if (actor.serviceId === TLACUILO_SMOKE_POLICY.executorServiceId) {
          await enforceTlacuiloPreconditions(supabase);
        }
        await reserveWrite(supabase, actor);

        const { data, error } = await supabase.rpc('arkhe_register_semantic_relation', {
          p_source_node_id: input.sourceNodeId,
          p_target_node_id: input.targetNodeId,
          p_relation_type: input.relationType,
          p_assertion: input.assertion,
          p_evidence_text: input.evidenceText,
          p_evidence_node_id: input.evidenceNodeId,
          p_evidence_uri: input.evidenceUri,
          p_created_by_investigator_id: actor.investigatorId,
          p_origin_kind: actor.originKind,
          p_origin_channel: actor.originChannel,
          p_provider: input.provider,
          p_model: input.model,
          p_run_ref: input.runRef,
          p_provenance: buildRelationProvenance(actor),
          p_supersedes_relation_id: input.supersedesRelationId,
        });

        if (error) throw error;
        return response(res, 201, { ok: true, relation_id: data, actor_kind: actor.kind });
      }

      // Reviewing/accepting/disputing/rejecting a relation is human governance,
      // not an action an AI investigator can grant itself.
      if (actor.kind !== 'human' || actor.investigatorId !== ANGEL_ID) {
        throw httpError('Solo Ángel, con sesión WebAuthn reciente, puede revisar relaciones.', 403);
      }

      const review = validateReviewRelationBody(body);
      await reserveWrite(supabase, actor);

      const { data, error } = await supabase.rpc('arkhe_append_semantic_relation_event', {
        p_relation_id: review.relationId,
        p_event_type: review.eventType,
        p_actor_investigator_id: actor.investigatorId,
        p_actor_kind: 'human',
        p_event_payload: review.eventPayload,
      });

      if (error) throw error;
      return response(res, 200, {
        ok: true,
        event_id: data,
        relation_id: review.relationId,
        review_status: review.eventType,
      });
    } catch (caught) {
      const error = mapDatabaseError(caught);
      if ((error.status ?? 500) >= 500) {
        console.error('[Arkhé semantic relations]', { code: caught?.code ?? null });
      }
      return response(res, error.status ?? 500, {
        ok: false,
        error: error.message ?? 'Error interno de relaciones semánticas.',
      });
    }
  };
}

export default createSemanticRelationsHandler();
