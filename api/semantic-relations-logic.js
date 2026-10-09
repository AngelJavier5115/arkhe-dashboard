import { isRecentReauthentication, ANGEL_ID } from './human-session.js';
import {
  authenticateServiceRequest,
  expectedInvestigatorForService,
  MAX_CLOCK_SKEW_MS,
} from './service-auth.js';

const SERVICE_HEADER_NAMES = [
  'x-arkhe-service-id',
  'x-arkhe-timestamp',
  'x-arkhe-nonce',
  'x-arkhe-signature',
];

const IDENTITY_CLAIM_FIELDS = [
  'actor_id',
  'investigador_id',
  'investigator_id',
  'created_by_investigator_id',
  'origin_kind',
  'origin_channel',
  'actor_kind',
];

export const RELATION_TYPES = new Set([
  'supports',
  'contradicts',
  'derives_from',
  'extends',
  'questions',
  'duplicates',
  'describes',
]);

export const REVIEW_EVENT_TYPES = new Set([
  'relation_reviewed',
  'relation_disputed',
  'relation_rejected',
  'evidence_added',
  'note_added',
]);

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getHeader(headers = {}, name) {
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === name.toLowerCase());
  const value = key ? headers[key] : undefined;
  return Array.isArray(value) ? value[0] : value;
}

function hasServiceAuthenticationHeader(headers = {}) {
  return SERVICE_HEADER_NAMES.some(name => getHeader(headers, name) !== undefined);
}

function validRecentHumanSession(session, now) {
  return Boolean(
    session &&
    session.investigatorId === ANGEL_ID &&
    isRecentReauthentication(session, now)
  );
}

export async function authenticateSemanticActor(req, body, {
  supabase,
  getHumanSession,
  requireSameOrigin,
  now = Date.now(),
} = {}) {
  if (hasServiceAuthenticationHeader(req.headers ?? {})) {
    // Never downgrade a malformed signed-service request to browser-cookie auth.
    req.__arkheSignedBody = body;
    const identity = authenticateServiceRequest(req, { now });
    const expectedInvestigatorId = expectedInvestigatorForService(identity.serviceId);

    if (!identity.verified || !expectedInvestigatorId) {
      throw httpError('Firma de servicio inválida.', 401);
    }
    if (identity.investigadorId !== expectedInvestigatorId) {
      throw httpError('La identidad del servicio no está vinculada al investigador esperado.', 403);
    }

    const nonce = identity.nonce;
    if (typeof nonce !== 'string' || nonce.length < 8 || nonce.length > 200) {
      throw httpError('Nonce de servicio inválido.', 401);
    }

    const expiresAt = new Date(Number(identity.timestamp) + MAX_CLOCK_SKEW_MS).toISOString();
    const { error } = await supabase
      .from('core_request_nonces')
      .insert({
        nonce,
        service_id: identity.serviceId,
        request_timestamp: identity.timestamp,
        expires_at: expiresAt,
      });

    if (error) {
      if (error.code === '23505') throw httpError('Nonce ya utilizado.', 401);
      throw error;
    }

    return {
      kind: 'investigator',
      investigatorId: identity.investigadorId,
      originKind: 'investigator',
      originChannel: 'signed-service-api',
      serviceId: identity.serviceId,
      provider: null,
      authentication: {
        method: 'ed25519-service-signature',
        service_id: identity.serviceId,
        signature_verified: true,
        nonce_recorded: true,
        signed_timestamp_ms: identity.timestamp,
        independent_provider_attestation: false,
      },
    };
  }

  requireSameOrigin(req);
  const session = await getHumanSession(req, supabase);
  if (!session) throw httpError('Se requiere una sesión humana autenticada.', 401);
  if (!validRecentHumanSession(session, now)) {
    throw httpError('Se requiere una reautenticación WebAuthn reciente.', 401);
  }

  return {
    kind: 'human',
    investigatorId: ANGEL_ID,
    originKind: 'human',
    originChannel: 'dashboard-webauthn',
    serviceId: null,
    authentication: {
      method: 'webauthn-session',
      recent_reauthentication_verified: true,
      reauthenticated_at: session.reauthenticatedAt,
      independent_provider_attestation: false,
    },
  };
}

export function rejectClientIdentityClaims(body) {
  const present = IDENTITY_CLAIM_FIELDS.filter(field =>
    Object.prototype.hasOwnProperty.call(body ?? {}, field)
  );
  if (present.length) {
    throw httpError(
      'La identidad y el origen se derivan de la autenticación, no del cuerpo: ' + present.join(', ') + '.',
      400
    );
  }
  if (Object.prototype.hasOwnProperty.call(body ?? {}, 'provenance')) {
    throw httpError('La procedencia de autenticación la registra el servidor; no envíes provenance desde el cliente.', 400);
  }
}

function allowedFields(body, allowed, label) {
  const unknown = Object.keys(body ?? {}).filter(key => !allowed.has(key));
  if (unknown.length) throw httpError('Campos no admitidos en ' + label + ': ' + unknown.join(', ') + '.', 400);
}

function textField(value, field, { min = 1, max = 4000, required = true } = {}) {
  if (value === undefined || value === null) {
    if (!required) return null;
    throw httpError(field + ' es obligatorio.', 400);
  }
  if (typeof value !== 'string') throw httpError(field + ' debe ser texto.', 400);
  const clean = value.trim();
  if ((!clean && required) || (clean && clean.length < min)) {
    throw httpError(field + ' debe contener al menos ' + min + ' caracteres.', 400);
  }
  if (clean.length > max) throw httpError(field + ' supera el máximo de ' + max + ' caracteres.', 400);
  return clean || null;
}

function positiveNodeId(value, field, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw httpError(field + ' es obligatorio.', 400);
  }
  const validShape = typeof value === 'number'
    ? Number.isSafeInteger(value)
    : typeof value === 'string' && /^[0-9]+$/.test(value);
  const parsed = Number(value);
  if (!validShape || !Number.isSafeInteger(parsed) || parsed <= 0) {
    throw httpError(field + ' debe ser un ID numérico positivo.', 400);
  }
  return parsed;
}

function validUuid(value, field, required = true) {
  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw httpError(field + ' es obligatorio.', 400);
  }
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw httpError(field + ' debe ser un UUID válido.', 400);
  }
  return value;
}

function validHttpUrl(value, field) {
  const clean = textField(value, field, { min: 10, max: 2048 });
  let parsed;
  try { parsed = new URL(clean); } catch { throw httpError(field + ' no es una URL válida.', 400); }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw httpError(field + ' solo puede usar HTTP o HTTPS.', 400);
  }
  return parsed.toString();
}

function optionalMetadataText(body, key, max = 160) {
  if (body[key] === undefined || body[key] === null || body[key] === '') return null;
  return textField(body[key], key, { min: 1, max });
}

export function validateCreateRelationBody(body, actor) {
  allowedFields(body, new Set([
    'action', 'source_node_id', 'target_node_id', 'relation_type', 'assertion',
    'evidence_text', 'evidence_node_id', 'evidence_uri', 'provider', 'model',
    'run_ref', 'supersedes_relation_id',
  ]), 'la creación de relación');
  rejectClientIdentityClaims(body);

  const sourceNodeId = positiveNodeId(body.source_node_id, 'source_node_id');
  const targetNodeId = positiveNodeId(body.target_node_id, 'target_node_id');
  if (sourceNodeId === targetNodeId) throw httpError('El nodo de origen y destino deben ser distintos.', 400);

  if (!RELATION_TYPES.has(body.relation_type)) {
    throw httpError('relation_type no está en el catálogo permitido.', 400);
  }

  const assertion = textField(body.assertion, 'assertion', { min: 8, max: 3000 });
  const evidenceText = textField(body.evidence_text, 'evidence_text', { min: 8, max: 12000 });
  const evidenceNodeId = positiveNodeId(body.evidence_node_id, 'evidence_node_id', { required: false });
  const evidenceUri = body.evidence_uri === undefined || body.evidence_uri === null || body.evidence_uri === ''
    ? null
    : validHttpUrl(body.evidence_uri, 'evidence_uri');
  const supersedesRelationId = validUuid(body.supersedes_relation_id, 'supersedes_relation_id', false);

  let provider = null;
  let model = null;
  let runRef = null;
  if (actor.kind === 'investigator') {
    provider = optionalMetadataText(body, 'provider');
    model = optionalMetadataText(body, 'model');
    runRef = optionalMetadataText(body, 'run_ref', 240);
  } else {
    if (body.provider !== undefined || body.model !== undefined) {
      throw httpError('provider y model deben proceder de un investigador con firma válida.', 400);
    }
    runRef = optionalMetadataText(body, 'run_ref', 240);
    if (supersedesRelationId && actor.investigatorId !== ANGEL_ID) {
      throw httpError('Solo la identidad humana puede sustituir una relación existente.', 403);
    }
  }

  if (actor.kind === 'investigator' && supersedesRelationId) {
    throw httpError('Los investigadores pueden proponer relaciones nuevas; la sustitución requiere gobierno humano.', 403);
  }

  return {
    sourceNodeId,
    targetNodeId,
    relationType: body.relation_type,
    assertion,
    evidenceText,
    evidenceNodeId,
    evidenceUri,
    provider,
    model,
    runRef,
    supersedesRelationId,
  };
}

export function validateReviewRelationBody(body) {
  allowedFields(body, new Set([
    'action', 'relation_id', 'event_type', 'note', 'evidence_text', 'evidence_uri',
  ]), 'la revisión de relación');
  rejectClientIdentityClaims(body);

  const relationId = validUuid(body.relation_id, 'relation_id');
  if (!REVIEW_EVENT_TYPES.has(body.event_type)) {
    throw httpError('event_type no está permitido para una revisión humana.', 400);
  }
  const note = textField(body.note, 'note', { min: 8, max: 2000 });
  let evidenceText = null;
  let evidenceUri = null;

  if (body.event_type === 'evidence_added') {
    evidenceText = textField(body.evidence_text, 'evidence_text', { min: 8, max: 8000 });
    evidenceUri = body.evidence_uri === undefined || body.evidence_uri === null || body.evidence_uri === ''
      ? null
      : validHttpUrl(body.evidence_uri, 'evidence_uri');
  } else if (body.evidence_text !== undefined || body.evidence_uri !== undefined) {
    throw httpError('evidence_text y evidence_uri solo se admiten en evidence_added.', 400);
  }

  return {
    relationId,
    eventType: body.event_type,
    eventPayload: {
      note,
      ...(evidenceText ? { evidence_text: evidenceText } : {}),
      ...(evidenceUri ? { evidence_uri: evidenceUri } : {}),
    },
  };
}

export function buildRelationProvenance(actor) {
  return {
    authentication: actor.authentication,
    assertion_source: actor.kind === 'human' ? 'human-governance' : 'authenticated-investigator',
    provider_attestation: {
      status: 'not_independently_verified',
      note: 'La firma autentica al servicio que declaró la relación; no es una atestación criptográfica del proveedor del modelo.',
    },
  };
}

export function isServiceAuthenticatedRequest(req) {
  return hasServiceAuthenticationHeader(req.headers ?? {});
}

export { httpError, getHeader };
