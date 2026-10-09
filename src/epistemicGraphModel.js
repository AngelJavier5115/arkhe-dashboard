const RELATION_TYPES = {
  reference: { label: 'Referencia registrada', color: '#7890B5' },
  supports: { label: 'Apoya', color: '#59D6A6' },
  contradicts: { label: 'Contradice', color: '#F27691' },
  derives: { label: 'Se deriva de', color: '#A99AFF' },
  extends: { label: 'Amplía', color: '#63D9E5' },
  described: { label: 'Relación descrita', color: '#F4BD55' },
};

function normalise(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed; } catch {} }
  return {};
}
function relationshipType(value) {
  const token = normalise(value).replace(/[\s-]+/g, '_');
  if (!token || /^(referencia|referencia_registrada|reference|cita|citado)$/.test(token)) return 'reference';
  if (/contrad|refut|contra_evidencia|opone/.test(token)) return 'contradicts';
  if (/apoya|respald|supports?|evidence_for|corrobora/.test(token)) return 'supports';
  if (/deriva|depende|derived|depends|basado_en/.test(token)) return 'derives';
  if (/amplia|complement|extends?|expande/.test(token)) return 'extends';
  return 'described';
}
function relationArrays(node) {
  const metadata = asObject(node?.metadata);
  return [metadata.relaciones_epistemicas, metadata.relaciones, metadata.relationships]
    .filter(Array.isArray).flat().filter(item => item && typeof item === 'object' && !Array.isArray(item));
}
function getRelationTargetId(relation) {
  const target = relation.target_node_id ?? relation.target_id ?? relation.nodo_destino_id ?? relation.destino_id ?? relation.to_id ?? relation.target ?? relation.nodo_id ?? relation.ref_id;
  if (target && typeof target === 'object') return target.id ?? target.node_id ?? target.nodo_id ?? null;
  return target ?? null;
}
function getRelationEvidence(relation) {
  const evidence = relation.evidencia ?? relation.justificacion ?? relation.descripcion ?? relation.description ?? relation.evidence;
  return typeof evidence === 'string' && evidence.trim() ? evidence.trim() : null;
}
function isExplicitlyVerified(relation) {
  if (relation.verificada === true || relation.verified === true) return true;
  const status = normalise(relation.estado_verificacion ?? relation.verification_status);
  return status === 'verificada' || status === 'verified';
}

/** Builds edges only from persisted references and explicit structured metadata. */
export function buildEpistemicGraph(nodesData = []) {
  const nodes = Array.isArray(nodesData) ? nodesData : [];
  const nodeById = new Map(nodes.map(node => [String(node.id), node]));
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
    if (!nodeById.has(source) || !nodeById.has(target)) return;
    const type = edge.type ?? 'reference';
    const key = source + '->' + target + ':' + type;
    if (edges.has(key)) return;
    const info = RELATION_TYPES[type] ?? RELATION_TYPES.described;
    edges.set(key, {
      id: key, source, target, sourceId: source, targetId: target,
      type, label: edge.label || info.label, color: info.color,
      kind: edge.kind ?? (type === 'reference' ? 'reference' : 'semantic'),
      evidence: edge.evidence ?? null, verified: edge.verified === true,
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
      const rawType = relation.tipo_relacion ?? relation.relation_type ?? relation.tipo ?? relation.type ?? relation.relacion ?? '';
      const type = relationshipType(rawType);
      addEdge({
        sourceId: node.id, targetId, type, label: RELATION_TYPES[type]?.label ?? RELATION_TYPES.described.label,
        kind: 'semantic', evidence: getRelationEvidence(relation), verified: isExplicitlyVerified(relation),
      });
    }
  }
  return { nodes: graphNodes, links: [...edges.values()] };
}

export function getNodeConnections(selectedNode, nodesData = []) {
  if (!selectedNode || selectedNode.id === null || selectedNode.id === undefined) return [];
  const nodes = Array.isArray(nodesData) ? nodesData : [];
  const selectedId = String(selectedNode.id);
  const nodeById = new Map(nodes.map(node => [String(node.id), node]));
  const graph = buildEpistemicGraph(nodes);
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
      type, label: RELATION_TYPES[type]?.label ?? RELATION_TYPES.described.label,
      color: RELATION_TYPES[type]?.color ?? RELATION_TYPES.described.color,
      kind: 'semantic', evidence: getRelationEvidence(relation), verified: isExplicitlyVerified(relation),
      unresolved: true, direction: 'outgoing', neighborId: target, neighborNode: null,
    });
  }
  return connections;
}

export function relationLegend() {
  return Object.entries(RELATION_TYPES).map(([key, value]) => ({ key, ...value }));
}
