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

  const [forward, reverse, eventAccess] = await Promise.all([
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
    supabase.from('arkhe_semantic_relation_events')
      .select('id, event_type, actor_investigator_id, actor_kind')
      .limit(1),
  ]);

  if (forward.error || reverse.error || !Array.isArray(forward.data) || !Array.isArray(reverse.data)) {
    throw httpError('Tlacuilo no pudo comprobar que no existe una relación previa; no se escribió ninguna relación.', 503);
  }
  if (eventAccess.error || !Array.isArray(eventAccess.data)) {
    throw httpError('Tlacuilo no puede leer el historial necesario para verificar una relación; no se escribió ninguna relación.', 503);
  }
  if (forward.data.length > 0 || reverse.data.length > 0) {
    throw httpError('Ya existe una relación entre los nodos aprobados; la política de Tlacuilo se detiene sin duplicarla.', 409);
  }

  return {
    source_node_id: policy.sourceNodeId,
    target_node_id: policy.targetNodeId,
    approved_texts_match: true,
    relation_absent_in_both_directions: true,
    event_history_readable: true,
    semantic_writes_performed: 0,
  };
}

function requireExactActionFields(body, allowedFields, label) {
  const unexpected = Object.keys(body).filter(field => !allowedFields.has(field));
  if (unexpected.length) {
    throw httpError('Campos no admitidos en la acción ' + label + ': ' + unexpected.join(', ') + '.', 400);
  }
}

async function verifyTlacuiloRelation(supabase, relationId) {
  const policy = TLACUILO_SMOKE_POLICY;
  const { data: relation, error: relationError } = await supabase
    .from('arkhe_semantic_relations')
    .select('id, source_node_id, target_node_id, relation_type, assertion, evidence_text, evidence_node_id, evidence_uri, created_by_investigator_id, origin_kind, origin_channel, provider, model, run_ref, provenance, supersedes_relation_id')
    .eq('id', relationId)
    .maybeSingle();

  if (relationError) {
    throw httpError('Tlacuilo no pudo leer la relación para verificar el resultado; requiere reconciliación manual.', 503);
  }
  if (!relation) {
    throw httpError('No se encontró la relación indicada; no vuelvas a enviar la escritura sin revisar el estado.', 409);
  }

  const validRelation =
    Number(relation.source_node_id) === policy.sourceNodeId &&
    Number(relation.target_node_id) === policy.targetNodeId &&
    relation.relation_type === policy.relationType &&
    relation.assertion === policy.assertion &&
    relation.evidence_text === policy.evidenceText &&
    relation.evidence_node_id === null &&
    relation.evidence_uri === null &&
    relation.created_by_investigator_id === policy.investigatorId &&
    relation.origin_kind === 'investigator' &&
    relation.origin_channel === 'signed-service-api' &&
    relation.provider === null &&
    relation.model === null &&
    relation.run_ref === null &&
    relation.supersedes_relation_id === null &&
    relation.provenance?.authentication?.service_id === policy.executorServiceId &&
    relation.provenance?.authentication?.signature_verified === true &&
    relation.provenance?.assertion_source === 'delegated-investigator-proposal' &&
    relation.provenance?.delegation?.executor_service_id === policy.executorServiceId &&
    relation.provenance?.delegation?.investigator_id === policy.investigatorId &&
    relation.provenance?.delegation?.policy_id === policy.policyId &&
    relation.provenance?.delegation?.scope?.source_node_id === policy.sourceNodeId &&
    relation.provenance?.delegation?.scope?.target_node_id === policy.targetNodeId &&
    relation.provenance?.delegation?.scope?.relation_type === policy.relationType &&
    relation.provenance?.delegation?.scope?.max_proposals === 1 &&
    relation.provenance?.provider_attestation?.status === 'not_independently_verified';

  if (!validRelation) {
    throw httpError('La relación existe, pero su alcance, atribución o procedencia no coincide con la política aprobada; requiere revisión manual.', 409);
  }

  const { data: events, error: eventError } = await supabase
    .from('arkhe_semantic_relation_events')
    .select('id, event_type, actor_investigator_id, actor_kind')
    .eq('relation_id', relationId)
    .order('created_at', { ascending: true });

  if (eventError || !Array.isArray(events)) {
    throw httpError('Tlacuilo no pudo leer el historial de eventos de la relación; requiere reconciliación manual.', 503);
  }
  if (
    events.length !== 1 ||
    events[0].event_type !== 'relation_created' ||
    events[0].actor_investigator_id !== policy.investigatorId ||
    events[0].actor_kind !== 'investigator'
  ) {
    throw httpError('La relación existe, pero el historial no coincide con una única creación aprobada; requiere revisión manual.', 409);
  }

  return {
    relation_id: relation.id,
    source_node_id: policy.sourceNodeId,
    target_node_id: policy.targetNodeId,
    relation_type: policy.relationType,
    created_by_investigator_id: policy.investigatorId,
    origin_channel: 'signed-service-api',
    executor_service_id: policy.executorServiceId,
    delegation_policy_id: policy.policyId,
    verified_creation_events: 1,
    independent_provider_attestation: false,
  };
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

      if (!['create', 'review', 'preflight', 'verify'].includes(body.action)) {
        throw httpError('Acción desconocida. Usa create, review, preflight o verify.', 400);
      }

      // Use the server-only Supabase key. If unavailable, this fails closed.
      const supabase = deps.getSupabase();
      const actor = await authenticateSemanticActor(req, body, {
        supabase,
        getHumanSession: deps.getHumanSession,
        requireSameOrigin: deps.requireSameOrigin,
        now: deps.now(),
      });

      // Tlacuilo read operations are signed independently from Atlas, but are
      // deliberately restricted to this one fixed policy. The runner never gets
      // a Supabase key; reads remain on the server behind the signed API.
      if (body.action === 'preflight') {
        requireExactActionFields(body, new Set(['action']), 'preflight');
        if (actor.serviceId !== TLACUILO_SMOKE_POLICY.executorServiceId || actor.kind !== 'investigator') {
          throw httpError('El preflight de Tlacuilo requiere la identidad firmada del servicio tlacuilo.', 403);
        }
        const checks = await enforceTlacuiloPreconditions(supabase);
        return response(res, 200, {
          ok: true,
          mode: 'preflight',
          ...checks,
          nonce_recorded: actor.authentication?.nonce_recorded === true,
          note: 'Inspección firmada de sólo lectura semántica; no se creó ni modificó ninguna relación.',
        });
      }

      if (body.action === 'verify') {
        requireExactActionFields(body, new Set(['action', 'relation_id']), 'verify');
        if (actor.serviceId !== TLACUILO_SMOKE_POLICY.executorServiceId || actor.kind !== 'investigator') {
          throw httpError('La verificación de Tlacuilo requiere la identidad firmada del servicio tlacuilo.', 403);
        }
        if (typeof body.relation_id !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.relation_id)) {
          throw httpError('relation_id debe ser un UUID válido.', 400);
        }
        const verified = await verifyTlacuiloRelation(supabase, body.relation_id);
        return response(res, 200, { ok: true, mode: 'verify', ...verified, nonce_recorded: actor.authentication?.nonce_recorded === true });
      }

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
