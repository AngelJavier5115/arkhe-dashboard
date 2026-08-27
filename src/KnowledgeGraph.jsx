import React, { useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const STATUS_COLORS = {
  Corroborado: '#22c55e', // Verde
  Falsado: '#ef4444',     // Rojo
  Ruido: '#eab308',       // Amarillo
  Postulado: '#3b82f6',   // Azul
};

export default function KnowledgeGraph({ nodesData }) {
  // Transformar los registros de Supabase a formato de Grafo (Nodes y Links)
  const graphData = useMemo(() => {
    if (!nodesData || nodesData.length === 0) return { nodes: [], links: [] };

    const nodes = nodesData.map((n) => ({
      id: n.id,
      label: `#${n.id} ${n.tipo || 'NODO'}`,
      content: n.contenido,
      status: n.estado || 'Postulado',
      val: 6,
    }));

    const links = [];
    nodesData.forEach((n) => {
      // Si el nodo tiene una referencia (ref_id o ref en su contenido/metadata)
      if (n.ref_id) {
        links.push({
          source: n.id,
          target: n.ref_id,
        });
      }
    });

    return { nodes, links };
  }, [nodesData]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg overflow-hidden h-[450px] relative">
      <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        Red Epistémica (Grafo Interactivo)
      </h3>
      
      {graphData.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          No hay nodos suficientes para renderizar el grafo.
        </div>
      ) : (
        <ForceGraph2D
          graphData={graphData}
          nodeAutoColorBy="status"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.label;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Dibujar círculo del nodo
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = STATUS_COLORS[node.status] || '#94a3b8';
            ctx.fill();

            // Dibujar texto del ID/Tipo
            ctx.fillStyle = '#f8fafc';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, node.x, node.y + 10);
          }}
          linkColor={() => '#475569'}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          backgroundColor="#0f172a"
        />
      )}
    </div>
  );
}
