import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEpistemicGraph, getNodeConnections } from '../src/epistemicGraphModel.js';

const sampleNodes = [
  { id: 1, ref_id: 2, tipo: 'aporte', estado: 'postulado', contenido: 'Este texto contradice otra hipótesis, pero no declara una relación estructurada.', metadata: {} },
  { id: 2, ref_id: null, tipo: 'hipótesis', estado: 'corroborado', contenido: 'Hipótesis B.', metadata: {} },
  { id: 3, ref_id: null, tipo: 'crítica', estado: 'postulado', contenido: 'Crítica.', metadata: {
    relaciones_epistemicas: [
      { nodo_destino_id: 2, tipo_relacion: 'contradice', evidencia: 'Explica la incompatibilidad observada.' },
      { nodo_destino_id: 1, tipo_relacion: 'apoya', verificada: true, evidencia: 'Evidencia registrada.' },
    ],
  } },
];

test('legacy ref_id becomes an explicit reference, not an inferred semantic claim', () => {
  const graph = buildEpistemicGraph(sampleNodes);
  const link = graph.links.find(edge => edge.source === '1' && edge.target === '2');
  assert.ok(link);
  assert.equal(link.kind, 'reference');
  assert.equal(link.type, 'reference');
  assert.match(link.label, /tipo no especificado/);
  assert.equal(link.verified, false);
});

test('the meaning of prose does not create semantic edges', () => {
  const graph = buildEpistemicGraph(sampleNodes);
  const fromOne = graph.links.filter(edge => edge.source === '1');
  assert.deepEqual(fromOne.map(edge => edge.type), ['reference']);
});

test('explicit semantic metadata creates typed edges with optional evidence and verification', () => {
  const graph = buildEpistemicGraph(sampleNodes);
  const contradiction = graph.links.find(edge => edge.source === '3' && edge.target === '2');
  const support = graph.links.find(edge => edge.source === '3' && edge.target === '1');
  assert.equal(contradiction.kind, 'semantic');
  assert.equal(contradiction.type, 'contradicts');
  assert.equal(contradiction.label, 'Contradice');
  assert.equal(contradiction.evidence, 'Explica la incompatibilidad observada.');
  assert.equal(contradiction.verified, false);
  assert.equal(support.type, 'supports');
  assert.equal(support.verified, true);
});

test('dangling references are not drawn as fabricated nodes but are visible in node inspection', () => {
  const nodes = [{ id: 9, ref_id: 999, tipo: 'aporte', estado: 'ruido', metadata: {} }];
  const graph = buildEpistemicGraph(nodes);
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.links.length, 0);
  const connections = getNodeConnections(nodes[0], nodes);
  assert.equal(connections.length, 1);
  assert.equal(connections[0].unresolved, true);
  assert.equal(connections[0].neighborId, '999');
});

test('node inspection returns incoming and outgoing explicit connections', () => {
  const connections = getNodeConnections(sampleNodes[1], sampleNodes);
  assert.ok(connections.some(edge => edge.source === '1' && edge.direction === 'incoming'));
  assert.ok(connections.some(edge => edge.source === '3' && edge.direction === 'incoming'));
});

test('self references are recorded for inspection without requiring fabricated neighbors', () => {
  const node = { id: 7, ref_id: 7, metadata: {} };
  const connections = getNodeConnections(node, [node]);
  assert.equal(connections.length, 1);
  assert.equal(connections[0].direction, 'self');
  assert.equal(connections[0].label, 'Autorreferencia registrada');
});


const persistedRelation = {
  id: 'relation-uuid-1',
  source_node_id: 1,
  target_node_id: 2,
  relation_type: 'supports',
  assertion: 'El aporte A respalda la hipótesis B bajo estas condiciones.',
  evidence_text: 'El contenido del nodo 1 aporta la premisa relevante y delimitada.',
  evidence_node_id: 1,
  evidence_uri: 'https://example.org/evidence',
  created_by_investigator_id: 'investigator-uuid',
  origin_kind: 'investigator',
  origin_channel: 'discord',
  provider: 'Groq',
  model: 'example-model',
  run_ref: 'round-8',
  provenance: { purpose: 'test', request_id: 'request-123' },
  supersedes_relation_id: null,
  created_at: '2026-10-09T20:00:00Z',
};

test('persisted semantic relations create typed edges and preserve evidence/provenance', () => {
  const graph = buildEpistemicGraph(sampleNodes, [persistedRelation], [
    { id: 'event-created', relation_id: persistedRelation.id, event_type: 'relation_created', created_at: '2026-10-09T20:00:00Z', actor_kind: 'investigator' },
  ]);
  const edge = graph.links.find(item => item.relationId === persistedRelation.id);
  assert.ok(edge);
  assert.equal(edge.kind, 'semantic');
  assert.equal(edge.type, 'supports');
  assert.equal(edge.assertion, persistedRelation.assertion);
  assert.equal(edge.evidence, persistedRelation.evidence_text);
  assert.equal(edge.evidenceNodeId, 1);
  assert.equal(edge.evidenceUri, persistedRelation.evidence_uri);
  assert.equal(edge.originChannel, 'discord');
  assert.equal(edge.provider, 'Groq');
  assert.equal(edge.model, 'example-model');
  assert.equal(edge.runRef, 'round-8');
  assert.equal(edge.provenance.request_id, 'request-123');
  assert.equal(edge.reviewStatus, 'proposed');
  assert.equal(edge.verified, false);
});

test('relation events update review status without pretending that review is scientific verification', () => {
  const events = [
    { id: 'created', relation_id: persistedRelation.id, event_type: 'relation_created', created_at: '2026-10-09T20:00:00Z' },
    { id: 'disputed', relation_id: persistedRelation.id, event_type: 'relation_disputed', created_at: '2026-10-09T20:30:00Z' },
    { id: 'reviewed-old', relation_id: persistedRelation.id, event_type: 'relation_reviewed', created_at: '2026-10-09T20:10:00Z' },
  ];
  const graph = buildEpistemicGraph(sampleNodes, [persistedRelation], events);
  const edge = graph.links.find(item => item.relationId === persistedRelation.id);
  assert.equal(edge.reviewStatus, 'disputed');
  assert.equal(edge.reviewLabel, 'En disputa');
  assert.equal(edge.verified, false);
  const connections = getNodeConnections(sampleNodes[0], sampleNodes, [persistedRelation], events);
  assert.ok(connections.some(item => item.relationId === persistedRelation.id && item.reviewStatus === 'disputed'));
});

test('persisted relation with missing loaded neighbor is inspectable without inventing a node', () => {
  const relation = { ...persistedRelation, source_node_id: 1, target_node_id: 999, id: 'relation-with-unloaded-target' };
  const graph = buildEpistemicGraph([sampleNodes[0]], [relation], []);
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.links.length, 0);
  const connections = getNodeConnections(sampleNodes[0], [sampleNodes[0]], [relation], []);
  const unresolved = connections.find(item => item.relationId === relation.id);
  assert.ok(unresolved);
  assert.equal(unresolved.unresolved, true);
  assert.equal(unresolved.neighborId, '999');
  assert.equal(unresolved.evidence, relation.evidence_text);
});

test('relation prose does not become a semantic connection unless structured data exists', () => {
  const node = { id: 44, ref_id: null, tipo: 'nota', estado: 'postulado', contenido: 'Esto apoya, cuestiona y contradice ideas cercanas.', metadata: {} };
  const graph = buildEpistemicGraph([node]);
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.links.length, 0);
});
