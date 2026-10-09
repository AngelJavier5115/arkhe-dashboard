const RELATION_TYPES = {
  reference: { label: 'Referencia registrada', color: '#7890B5' },
  supports: { label: 'Apoya', color: '#59D6A6' },
  contradicts: { label: 'Contradice', color: '#F27691' },
  derives_from: { label: 'Se deriva de', color: '#A99AFF' },
  extends: { label: 'Amplía', color: '#63D9E5' },
  questions: { label: 'Cuestiona', color: '#F4BD4A' },
  duplicates: { label: 'Duplica / converge con', color: '#EAA5E8' },
  describes: { label: 'Describe una relación', color: '#F4BD4A' },
};

const REVIEW_LABELS = {
  proposed: 'Propuesta',
  reviewed: 'Revisada',
  disputed: 'En disputa',
  rejected: 'Rechazada',
  superseded: 'Sustituida',
};

const EVENT_TO_STATUS = {
  relation_created: 'proposed',
  relation_reviewed: 'reviewed',
  relation_disputed: 'disputed',
  relation_rejected: 'rejected',
  relation_superseded: 'superseded',
};

function normalise(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // Unstructured values are not treated as relation metadata.
    }
  }
  return {};
}
function eventTime(event) {
  const value = new Date(event?.created_at ?? 0).getTime();
  return Number.isFinite(value) ? value : 0;
}
function relationshipType(value) {
  const token = normalise(value).replace(/[\s-]+/g, '_');
  if (!token || /^(referencia|referencia_registrada|reference|cita|citado)$/.test(token)) return 'reference';
  if (/contrad|refut|contra_evidencia|opone/.test(token)) return 'contradicts';
  if (/apoya|respald|supports?|evidence_for|corrobora/.test(token)) return 'supports';
  if (/deriv|derive|depende|depends|basado_en/.test(token)) return 'derives_from';
  if (/amplia|complement|extends?|expande/.test(token)) return 'extends';
  if (/cuestion|pregunta|questions?/.test(token)) return 'questions';
  if (/duplica|duplicat|equivalent|converge/.test(token)) return 'duplicates';
  if (/describe|relacion/.test(token)) return 'describes';
  return 'describes';
}
function relationArrays(node) {
  const metadata = asObject(node?.metadata);
  return [metadata.relaciones_epistemicas, metadata.relaciones, metadata.relationships]
    .filter(Array.isArray).flat().filter(item => item && typeof item === 'object' && !Array.isArray(item));
}
function getRelationTargetId(relation) {
  const target = relation.target_node_id ?? relation.target_id ?? relation.nodo_destino_id
    ?? relation.destino_id ?? relation.to_id ?? relation.target ?? relation.nodo_id ?? relation.ref_id;
  if (target && typeof target === 'object') return target.id ?? target.node_id ?? target.nodo_id ?? null;
  return target ?? null;
}
function getRelationEvidence(relation) {
  const evidence = relation.evidence_text ?? relation.evidence ?? relation.evidencia
    ?? relation.justificacion ?? relation.descripcion ?? relation.description;
  return typeof evidence === 'string' && evidence.trim() ? evidence.trim() : null;
}
function explicitlyVerified(relation) {
  if (relation.verificada === true || relation.verified === true) return true;
  const status = normalise(relation.estado_verificacion ?? relation.verification_status);
  return status === 'verificada' || status === 'verified';
}
export function latestRelationStatuses(events = []) {
  const sorted = [...(Array.isArray(events) ? events : [])].sort((a, b) => eventTime(b) - eventTime(a));
  const latest = new Map();
  for (const event of sorted) {
    const id = String(event.relation_id ?? '');
    const status = EVENT_TO_STATUS[event.event_type];
    if (!id || !status || latest.has(id)) continue;
    latest.set(id, { status, event });
  }
  return latest;
}
function persistedRelationToEdge(relation, events, statusMap) {
  const type = relationshipType(relation.relation_type);
  const id = String(relation.id);
  const rowEvents = events.filter(event => String(event.relation_id) === id).sort((a, b) => eventTime(a) - eventTime(b));
  const status = statusMap.get(id)?.status ?? 'proposed';
  return {
    id: 'relation:' + id,
    relationId: relation.id,
    source: String(relation.source_node_id),
    target: String(relation.target_node_id),
    sourceId: String(relation.source_node_id),
    targetId: String(relation.target_node_id),
    type,
    label: RELATION_TYPES[type]?.label ?? RELATION_TYPES.describes.label,
    color: RELATION_TYPES[type]?.color ?? RELATION_TYPES.describes.color,
    kind: 'semantic',
    evidence: relation.evidence_text ?? null,
    evidenceNodeId: relation.evidence_node_id ?? null,
    evidenceUri: relation.evidence_uri ?? null,
    assertion: relation.assertion ?? null,
    verified: false,
    originKind: relation.origin_kind ?? null,
    originChannel: relation.origin_channel ?? null,
    provider: relation.provider ?? null,
    model: relation.model ?? null,
    runRef: relation.run_ref ?? null,
    provenance: asObject(relation.provenance),
    createdByInvestigatorId: relation.created_by_investigator_id ?? null,
    createdAt: relation.created_at ?? null,
    supersedesRelationId: relation.supersedes_relation_id ?? null,
    reviewStatus: status,
    reviewLabel: REVIEW_LABELS[status] ?? REVIEW_LABELS.proposed,
    events: rowEvents,
    selfReference: String(relation.source_node_id) === String(relation.target_node_id),
    metadataOrigin: false,
  };
}

/**
 * Only stored references and structured, persisted relations become edges.
 * Natural-language prose is never interpreted as proof of a relationship.
 */
export function buildEpistemicGraph(nodesData = [], semanticRelations = [], relationEvents = []) {
  const nodes = Array.isArray(nodesData) ? nodesData : [];
  const relations = Array.isArray(semanticRelations) ? semanticRelations : [];
  const events = Array.isArray(relationEvents) ? relationEvents : [];
  const nodeById = new Map(nodes.map(node => [String(node.id), node]));
  const statusMap = latestRelationStatuses(events);

  const graphNodes = nodes.map(node => ({
    id: String(node.id),
    name: '#' + node.id + ' ' + (node.tipo || 'aporte'),
    title: node.contenido || node.texto || node.descripcion || '',
    sourceNode: node,
    val: 5,
    color: { corroborado: '#59d6a6', falsado: '#f27691', ruido: '#f4bd55', postulado: '#72a7ff' }[normalise(node.estado)] ?? '#94a3b8',
  }));

  const edges = new Map();
  const addEdge = edge => {
    if (edge.sourceId === null || edge.targetId === null || edge.sourceId === undefined || edge.targetId === undefined) return;
    const source = String(edge.sourceId);
    const target = String(edge.targetId);
    // Graph layout only receives edges whose two node records are loaded.
    if (!nodeById.has(source) || !nodeById.has(target)) return;
    const type = edge.type ?? 'reference';
    const key = edge.id ? String(edge.id) : source + '->' + target + ':' + type;
    if (edges.has(key)) return;
    const info = RELATION_TYPES[type] ?? RELATION_TYPES.describes;
    edges.set(key, {
      ...edge,
      id: key,
      source,
      target,
      sourceId: source,
      targetId: target,
      type,
      label: edge.label || info.label,
      color: edge.color || info.color,
      kind: edge.kind ?? (type === 'reference' ? 'reference' : 'semantic'),
      evidence: edge.evidence ?? null,
      verified: edge.verified === true,
      selfReference: source === target,
    });
  };

  for (const node of nodes) {
    if (node.ref_id !== null && node.ref_id !== undefined && String(node.ref_id).trim() !== '') {
      const target = String(node.ref_id);
      addEdge({
        sourceId: node.id, targetId: target, type: 'reference',
        label: target === String(node.id) ? 'Autorreferencia registrada' : 'Referencia registrada · tipo no especificado',
        kind: 'reference',
      });
    }
    for (const relation of relationArrays(node)) {
      const targetId = getRelationTargetId(relation);
      if (targetId === null || targetId === undefined || String(targetId).trim() === '') continue;
      const type = relationshipType(relation.tipo_relacion ?? relation.relation_type ?? relation.tipo ?? relation.type ?? relation.relacion ?? '');
      addEdge({
        id: relation.id ? 'metadata:' + relation.id : undefined,
        sourceId: node.id,
        targetId,
        type,
        label: RELATION_TYPES[type]?.label ?? RELATION_TYPES.describes.label,
        kind: 'semantic',
        evidence: getRelationEvidence(relation),
        assertion: relation.afirmacion ?? relation.assertion ?? relation.enunciado ?? null,
        verified: explicitlyVerified(relation),
        provenance: asObject(relation.procedencia ?? relation.provenance),
        createdAt: relation.created_at ?? null,
        metadataOrigin: true,
      });
    }
  }

  for (const relation of relations) {
    const edge = persistedRelationToEdge(relation, events, statusMap);
    addEdge(edge);
  }
  return { nodes: graphNodes, links: [...edges.values()] };
}

export function getNodeConnections(selectedNode, nodesData = [], semanticRelations = [], relationEvents = []) {
  if (!selectedNode || selectedNode.id === null || selectedNode.id === undefined) return [];
  const nodes = Array.isArray(nodesData) ? nodesData : [];
  const relations = Array.isArray(semanticRelations) ? semanticRelations : [];
  const events = Array.isArray(relationEvents) ? relationEvents : [];
  const selectedId = String(selectedNode.id);
  const nodeById = new Map(nodes.map(node => [String(node.id), node]));
  const graph = buildEpistemicGraph(nodes, relations, events);
  const statusMap = latestRelationStatuses(events);
  const connections = [];

  for (const link of graph.links) {
    if (link.source === selectedId && link.target === selectedId) {
      connections.push({ ...link, direction: 'self', neighborId: selectedId, neighborNode: selectedNode });
    } else if (link.source === selectedId) {
      connections.push({ ...link, direction: 'outgoing', neighborId: link.target, neighborNode: nodeById.get(link.target) ?? null });
    } else if (link.target === selectedId) {
      connections.push({ ...link, direction: 'incoming', neighborId: link.source, neighborNode: nodeById.get(link.source) ?? null });
    }
  }

  if (selectedNode.ref_id !== null && selectedNode.ref_id !== undefined
    && String(selectedNode.ref_id) !== selectedId && !nodeById.has(String(selectedNode.ref_id))) {
    connections.push({
      id: 'unresolved-reference:' + selectedId + ':' + selectedNode.ref_id,
      source: selectedId, target: String(selectedNode.ref_id), sourceId: selectedId, targetId: String(selectedNode.ref_id),
      type: 'reference', label: 'Referencia registrada · destino no disponible', color: RELATION_TYPES.reference.color,
      kind: 'reference', evidence: null, verified: false, unresolved: true,
      direction: 'outgoing', neighborId: String(selectedNode.ref_id), neighborNode: null,
      reviewStatus: 'proposed', reviewLabel: REVIEW_LABELS.proposed,
    });
  }

  // Relations remain inspectable if the target node is outside the current
  // loaded window. We display the unresolved ID rather than a fake graph node.
  for (const relation of relations) {
    const sourceId = String(relation.source_node_id);
    const targetId = String(relation.target_node_id);
    const sourceIsSelected = sourceId === selectedId;
    const targetIsSelected = targetId === selectedId;
    if (!sourceIsSelected && !targetIsSelected) continue;
    const neighborId = sourceIsSelected ? targetId : sourceId;
    if (nodeById.has(neighborId)) continue;
    const edge = persistedRelationToEdge(relation, events, statusMap);
    if (connections.some(item => item.id === edge.id)) continue;
    connections.push({
      ...edge,
      direction: sourceIsSelected ? 'outgoing' : 'incoming',
      neighborId,
      neighborNode: null,
      unresolved: true,
    });
  }

  for (const relation of relationArrays(selectedNode)) {
    const targetId = getRelationTargetId(relation);
    if (targetId === null || targetId === undefined || String(targetId).trim() === '') continue;
    const target = String(targetId);
    if (nodeById.has(target) || target === selectedId) continue;
    const type = relationshipType(relation.tipo_relacion ?? relation.relation_type ?? relation.tipo ?? relation.type ?? relation.relacion ?? '');
    connections.push({
      id: 'unresolved-semantic:' + selectedId + ':' + target + ':' + type,
      source: selectedId, target, sourceId: selectedId, targetId: target,
      type, label: RELATION_TYPES[type]?.label ?? RELATION_TYPES.describes.label,
      color: RELATION_TYPES[type]?.color ?? RELATION_TYPES.describes.color,
      kind: 'semantic', evidence: getRelationEvidence(relation), verified: explicitlyVerified(relation),
      unresolved: true, direction: 'outgoing', neighborId: target, neighborNode: null,
      reviewStatus: 'proposed', reviewLabel: REVIEW_LABELS.proposed,
      assertion: relation.afirmacion ?? relation.assertion ?? null,
      metadataOrigin: true,
      provenance: asObject(relation.procedencia ?? relation.provenance),
    });
  }
  return connections;
}

export function relationLegend() {
  return Object.entries(RELATION_TYPES).map(([key, value]) => ({ key, ...value }));
}
