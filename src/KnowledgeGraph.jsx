import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Focus, HelpCircle, Network, ZoomIn, ZoomOut } from 'lucide-react';
import { buildEpistemicGraph, relationLegend } from './epistemicGraphModel.js';

export default function KnowledgeGraph({ nodesData = [], onNodeSelect, focusNodeId = null }) {
  const fgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 280 });
  const [localFocusId, setLocalFocusId] = useState(null);

  useEffect(() => {
    setLocalFocusId(focusNodeId === null || focusNodeId === undefined ? null : String(focusNodeId));
  }, [focusNodeId]);

  const model = useMemo(() => buildEpistemicGraph(nodesData), [nodesData]);
  const graphData = useMemo(() => ({
    nodes: model.nodes,
    // A self-reference remains visible in the inspector, but a loop on one
    // node is omitted from the force layout to avoid a misleading visual knot.
    links: model.links.filter(link => !link.selfReference),
  }), [model]);
  const activeNodeId = localFocusId;

  const focusState = useMemo(() => {
    if (!activeNodeId) return { nodeIds: new Set(), linkIds: new Set() };
    const nodeIds = new Set([activeNodeId]);
    const linkIds = new Set();
    for (const link of graphData.links) {
      if (link.sourceId === activeNodeId || link.targetId === activeNodeId) {
        nodeIds.add(link.sourceId);
        nodeIds.add(link.targetId);
        linkIds.add(link.id);
      }
    }
    return { nodeIds, linkIds };
  }, [activeNodeId, graphData.links]);

  const counts = useMemo(() => ({
    references: graphData.links.filter(link => link.kind === 'reference').length,
    semantic: graphData.links.filter(link => link.kind === 'semantic').length,
  }), [graphData.links]);

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
        <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-300" />{graphData.nodes.length} nodos</span>
          <span className="text-slate-700">·</span>
          <span>{counts.references} referencias explícitas</span>
          <span className="text-slate-700">·</span>
          <span>{counts.semantic} relaciones semánticas</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => fgRef.current?.zoom(1.3, 250)} className="graph-control" aria-label="Acercar grafo"><ZoomIn size={13} /></button>
          <button type="button" onClick={() => fgRef.current?.zoom(0.75, 250)} className="graph-control" aria-label="Alejar grafo"><ZoomOut size={13} /></button>
          <button type="button" onClick={() => { setLocalFocusId(null); fgRef.current?.zoomToFit(350, 42); }} className="graph-control" aria-label="Centrar grafo y quitar selección"><Focus size={13} /></button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {relationLegend().filter(item => item.key !== 'described').map(item => (
          <span key={item.key} className="inline-flex items-center gap-1.5 text-[9px] text-slate-500">
            <span className="h-1.5 w-4 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <div ref={containerRef} className="graph-canvas relative h-[300px] min-w-0 overflow-hidden rounded-xl border border-slate-800/80 sm:h-[360px]">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(3, 9, 21, 0)"
          nodeLabel={node => node.title ? node.name + '\n' + String(node.title).slice(0, 200) : node.name}
          onNodeClick={node => {
            setLocalFocusId(node.id);
            onNodeSelect?.(node.sourceNode);
          }}
          onBackgroundClick={() => setLocalFocusId(null)}
          nodeColor={node => activeNodeId && !focusState.nodeIds.has(node.id) ? 'rgba(72, 86, 113, .28)' : node.color}
          nodeRelSize={4.8}
          nodeVal={node => node.val}
          linkColor={link => activeNodeId && !focusState.linkIds.has(link.id) ? 'rgba(90, 104, 130, .1)' : link.color}
          linkWidth={link => activeNodeId && focusState.linkIds.has(link.id) ? 2.1 : (link.kind === 'semantic' ? 1.7 : 1.1)}
          linkCurvature={link => link.sourceId === link.targetId ? 0.25 : 0}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.82}
          linkDirectionalArrowColor={link => link.color}
          linkDirectionalParticles={link => activeNodeId && focusState.linkIds.has(link.id) ? 3 : (link.kind === 'semantic' ? 2 : 1)}
          linkDirectionalParticleSpeed={link => link.kind === 'semantic' ? 0.005 : 0.003}
          linkDirectionalParticleWidth={link => activeNodeId && focusState.linkIds.has(link.id) ? 2.2 : 1.4}
          linkDirectionalParticleColor={link => link.color}
          cooldownTicks={100}
          onEngineStop={() => fgRef.current?.zoomToFit(250, 42)}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const focused = activeNodeId && node.id === activeNodeId;
            const neighbor = activeNodeId && focusState.nodeIds.has(node.id) && !focused;
            const dimmed = activeNodeId && !focusState.nodeIds.has(node.id);
            const radius = focused ? 8 : neighbor ? 6.2 : 4.8;

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.strokeStyle = focused ? '#E5F0FF' : neighbor ? node.color : 'rgba(150, 164, 190, .2)';
            ctx.lineWidth = focused ? 1.5 : 1;
            ctx.stroke();

            if (dimmed) return;
            if (globalScale < 0.55) return;
            const label = node.name;
            const fontSize = Math.max(3, Math.min(9, 9 / Math.sqrt(globalScale)));
            ctx.font = '500 ' + fontSize + 'px Inter, ui-sans-serif, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = focused ? '#FFFFFF' : 'rgba(219, 231, 249, .92)';
            ctx.fillText(label, node.x, node.y + radius + 3);
          }}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-700/70 bg-slate-950/75 px-2.5 py-1.5 text-[9px] text-slate-500 backdrop-blur">
          <span className="inline-flex items-center gap-1.5"><HelpCircle size={11} />Toca un nodo para resaltar sus conexiones y abrir su ficha</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2 rounded-xl border border-blue-300/10 bg-blue-400/[0.035] p-3">
        <Network size={14} className="mt-0.5 shrink-0 text-blue-300" />
        <p className="text-[10px] leading-5 text-slate-500">
          Las líneas grises/azules son referencias registradas. Las líneas de color representan relaciones semánticas solo cuando están declaradas en metadatos estructurados; no se deducen del texto ni de la cercanía visual.
        </p>
      </div>
    </div>
  );
}
