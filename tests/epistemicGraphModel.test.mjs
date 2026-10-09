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
