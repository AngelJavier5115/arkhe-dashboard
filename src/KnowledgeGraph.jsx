import React, { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

// Mapeo de colores tolerant a mayúsculas/minúsculas
const STATUS_COLORS = {
  corroborado: '#22c55e',
  Corroborado: '#22c55e',
  falsado: '#ef4444',
  Falsado: '#ef4444',
  ruido: '#eab308',
  Ruido: '#eab308',
  postulado: '#3b82f6',
  Postulado: '#3b82f6',
};

export default function KnowledgeGraph({ nodesData }) {
  const fgRef = useRef();

  // Mapear los datos de Supabase al formato requerido por react-force-graph
  const graphData = React.useMemo(() => {
    if (!nodesData || nodesData.length === 0) return { nodes: [], links: [] };

    const nodes = nodesData.map((node) => ({
      id: node.id,
      name: `#${node.id} ${node.tipo || 'nodo'}`,
      val: 5,
      color: STATUS_COLORS[node.estado] || STATUS_COLORS[node.estado?.toLowerCase()] || '#94a3b8',
      estado: node.estado,
    }));

    const links = nodesData
      .filter((node) => node.ref_id)
      .map((node) => ({
        source: node.id,
        target: node.ref_id,
      }));

    return { nodes, links };
  }, [nodesData]);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      fgRef.current.zoomToFit(400, 50);
    }
  }, [graphData]);

  if (graphData.nodes.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
        No hay nodos suficientes para renderizar el grafo.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden relative">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Red Epistémica (Grafo Interactivo)
        </h2>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Postulado
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Corroborado
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Falsado
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Ruido
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-80 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800/50">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeColor={(node) => node.color}
          nodeRelSize={6}
          linkColor={() => '#475569'}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => '#818cf8'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Dibujar círculo del nodo
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();

            // Dibujar etiqueta debajo
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(label, node.x, node.y + 10);
          }}
        />
      </div>
    </div>
  );
}
