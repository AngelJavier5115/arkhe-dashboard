import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { HelpCircle, Focus, Network, ZoomIn, ZoomOut } from 'lucide-react';

const STATUS_COLORS = {
  corroborado: '#59d6a6',
  falsado: '#f27691',
  ruido: '#f4bd55',
  postulado: '#72a7ff',
};

function statusKey(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('corrobor')) return 'corroborado';
  if (normalized.includes('fals')) return 'falsado';
  if (normalized.includes('ruido')) return 'ruido';
  return 'postulado';
}

export default function KnowledgeGraph({ nodesData = [], onNodeSelect }) {
  const fgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 280 });
  const graphData = useMemo(() => {
    const ids = new Set(nodesData.map(node => String(node.id)));
    const nodes = nodesData.map(node => ({
      id: String(node.id),
      name: '#' + node.id + ' ' + (node.tipo || 'aporte'),
      title: node.contenido || node.texto || node.descripcion || '',
      sourceNode: node,
      val: 5,
      color: STATUS_COLORS[statusKey(node.estado)] || '#94a3b8',
    }));
    const links = nodesData
      .filter(node => node.ref_id && ids.has(String(node.ref_id)))
      .map(node => ({ source: String(node.id), target: String(node.ref_id) }));
    return { nodes, links };
  }, [nodesData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setDimensions({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0 && dimensions.width > 1) {
      const timer = window.setTimeout(() => fgRef.current?.zoomToFit(420, 42), 120);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [graphData, dimensions.width, dimensions.height]);

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 px-5 text-center">
        <Network size={22} className="mb-3 text-slate-600" />
        <p className="text-xs font-medium text-slate-300">La red todavía está vacía</p>
        <p className="mt-1 max-w-xs text-[10px] leading-5 text-slate-600">Cuando existan aportes disponibles, sus referencias aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-blue-300" />{graphData.nodes.length} nodos <span className="text-slate-700">·</span> {graphData.links.length} vínculos explícitos</div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => fgRef.current?.zoom(1.3, 250)} className="graph-control" aria-label="Acercar grafo"><ZoomIn size={13} /></button>
          <button type="button" onClick={() => fgRef.current?.zoom(0.75, 250)} className="graph-control" aria-label="Alejar grafo"><ZoomOut size={13} /></button>
          <button type="button" onClick={() => fgRef.current?.zoomToFit(350, 42)} className="graph-control" aria-label="Centrar grafo"><Focus size={13} /></button>
        </div>
      </div>
      <div ref={containerRef} className="graph-canvas relative h-[280px] min-w-0 overflow-hidden rounded-xl border border-slate-800/80 sm:h-[340px]">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(3, 9, 21, 0)"
          onNodeClick={node => onNodeSelect?.(node.sourceNode)}
          nodeColor={node => node.color}
          nodeRelSize={4.5}
          nodeVal={node => node.val}
          linkColor={() => 'rgba(109, 132, 170, .45)'}
          linkWidth={1.2}
          linkDirectionalParticles={1}
          linkDirectionalParticleSpeed={0.003}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleColor={() => '#9f9aff'}
          cooldownTicks={90}
          onEngineStop={() => fgRef.current?.zoomToFit(250, 42)}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            if (globalScale < 0.55) return;
            const label = node.name;
            const fontSize = Math.max(3, Math.min(9, 9 / Math.sqrt(globalScale)));
            ctx.font = '500 ' + fontSize + 'px Inter, ui-sans-serif, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(219, 231, 249, .9)';
            ctx.fillText(label, node.x, node.y + 7);
          }}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-700/70 bg-slate-950/75 px-2.5 py-1.5 text-[9px] text-slate-500 backdrop-blur">
          <span className="inline-flex items-center gap-1.5"><HelpCircle size={11} />Toca un nodo para abrir su detalle</span>
        </div>
      </div>
    </div>
  );
}
