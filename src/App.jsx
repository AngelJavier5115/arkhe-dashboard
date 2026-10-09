import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, ArrowRight, Atom, Bell, BookOpen, Boxes, CheckCircle2,
  ChevronDown, ChevronRight, Clock3, Database, FileText, GitBranch,
  HelpCircle, Layers, LayoutDashboard, Menu, Microscope, Network,
  RefreshCw, Search, Settings2, Sparkles, TreePine, Users, X
} from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';
import { getNodeConnections } from './epistemicGraphModel.js';
import ArkheTree from './ArkheTree';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const navItems = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard, group: 'Espacio' },
  { id: 'investigaciones', label: 'Investigaciones', icon: Microscope, group: 'Espacio' },
  { id: 'investigadores', label: 'Investigadores', icon: Users, group: 'Espacio' },
  { id: 'rondas', label: 'Rondas', icon: Layers, group: 'Espacio' },
  { id: 'actividad', label: 'Actividad', icon: Activity, group: 'Espacio' },
  { id: 'areas', label: 'Áreas', icon: TreePine, group: 'Estructura' },
  { id: 'recursos', label: 'Recursos', icon: BookOpen, group: 'Estructura' },
  { id: 'configuracion', label: 'Configuración', icon: Settings2, group: 'Sistema' },
];

const statusColors = {
  postulado: 'blue',
  corroborado: 'green',
  falsado: 'red',
  ruido: 'amber',
};

const statusLabels = {
  postulado: 'Postulado',
  corroborado: 'Corroborado',
  falsado: 'Falsado',
  ruido: 'Ruido',
};

const avatarStyles = [
  'from-amber-400/25 to-orange-500/10 text-amber-200 border-amber-300/15',
  'from-blue-500/25 to-cyan-400/10 text-blue-200 border-blue-300/15',
  'from-violet-500/25 to-fuchsia-400/10 text-violet-200 border-violet-300/15',
  'from-emerald-500/25 to-teal-400/10 text-emerald-200 border-emerald-300/15',
  'from-rose-500/25 to-pink-400/10 text-rose-200 border-rose-300/15',
];

const statusClasses = {
  blue: 'text-blue-300 bg-blue-400/10 border-blue-300/15',
  green: 'text-emerald-300 bg-emerald-400/10 border-emerald-300/15',
  red: 'text-rose-300 bg-rose-400/10 border-rose-300/15',
  amber: 'text-amber-300 bg-amber-400/10 border-amber-300/15',
  violet: 'text-violet-200 bg-violet-400/10 border-violet-300/15',
  neutral: 'text-slate-300 bg-slate-700/40 border-slate-600/40',
};

function statusKey(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('corrobor')) return 'corroborado';
  if (normalized.includes('fals')) return 'falsado';
  if (normalized.includes('ruido')) return 'ruido';
  return 'postulado';
}

function formatDate(value, withTime = false) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', withTime
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  ).format(date);
}

function shortText(value, max = 132) {
  const text = String(value ?? '').trim();
  if (!text) return 'Sin descripción disponible.';
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

function getNodeText(node) {
  return node?.contenido || node?.texto || node?.descripcion || node?.dictamen_aletheia || '';
}

function getNodeTitle(node) {
  const kind = String(node?.tipo || '').trim();
  const text = getNodeText(node);
  if (kind && kind.length < 56 && !/^aporte$/i.test(kind)) return kind;
  if (text) return shortText(text, 62);
  return node?.id ? 'Aporte #' + node.id : 'Investigación';
}

function Badge({ children, tone = 'neutral', dot = false }) {
  return (
    <span className={'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ' + (statusClasses[tone] || statusClasses.neutral)}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

function Panel({ children, className = '', title, subtitle, action }) {
  return (
    <section className={'glass-panel min-w-0 rounded-2xl p-4 sm:p-5 ' + className}>
      {(title || subtitle || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function SectionHeading({ eyebrow, title, description, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/80">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {right}
    </div>
  );
}

function InvestigatorAvatar({ investigator, index = 0, small = false }) {
  const name = investigator?.nombre || 'Investigador';
  return (
    <div className={'flex shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br font-semibold shadow-inner ' + avatarStyles[index % avatarStyles.length] + (small ? ' h-8 w-8 text-[10px]' : ' h-11 w-11 text-xs')}>
      {name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  );
}

function StateIndicator({ state }) {
  const value = String(state ?? '').toLowerCase();
  const color = ['disponible', 'activo', 'activa', 'abierta', 'en curso'].some(x => value.includes(x))
    ? 'bg-emerald-400'
    : value.includes('error') || value.includes('fall') ? 'bg-rose-400'
    : value.includes('paus') || value.includes('pendiente') ? 'bg-amber-400'
    : 'bg-slate-500';
  return <span className={'inline-block h-1.5 w-1.5 rounded-full ' + color} />;
}

function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/70 px-5 py-10 text-center">
      <div className="mb-3 rounded-2xl border border-slate-700/70 bg-slate-800/70 p-3 text-slate-400"><Database size={19} /></div>
      <p className="text-sm font-medium text-slate-200">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function NodeRow({ node, onClick }) {
  const key = statusKey(node.estado);
  const title = getNodeTitle(node);
  return (
    <button type="button" onClick={() => onClick?.(node)} className="group flex w-full items-start gap-3 rounded-xl border border-transparent p-3 text-left transition hover:border-slate-700/80 hover:bg-slate-800/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-300/10 bg-blue-400/10 text-blue-300"><FileText size={16} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-200 group-hover:text-white">{title}</span>
          <Badge tone={statusColors[key]}>{statusLabels[key]}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{shortText(getNodeText(node), 175)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
          <span>{node.autor || 'Autor no identificado'}</span>
          <span className="inline-flex items-center gap-1"><Clock3 size={11} />{formatDate(node.created_at)}</span>
          {node.ref_id && <span className="inline-flex items-center gap-1"><GitBranch size={11} />Referencia #{node.ref_id}</span>}
        </div>
      </div>
      <ChevronRight size={15} className="mt-2 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
    </button>
  );
}

function RoundRow({ round, onClick }) {
  const tone = String(round.estado).toLowerCase().includes('cerr') ? 'green' : String(round.estado).toLowerCase().includes('paus') ? 'amber' : 'blue';
  return (
    <button type="button" onClick={() => onClick?.(round)} className="group flex w-full items-start gap-3 rounded-xl border border-transparent p-3 text-left transition hover:border-slate-700/80 hover:bg-slate-800/45">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/10 text-violet-300"><Layers size={16} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-200 group-hover:text-white">Ronda #{round.numero}</span>
          <Badge tone={tone}>{round.estado || 'Sin estado'}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{shortText(round.pregunta, 150)}</p>
        <span className="mt-2 block text-[10px] text-slate-600">{formatDate(round.created_at, true)}</span>
      </div>
      <ChevronRight size={15} className="mt-2 shrink-0 text-slate-600" />
    </button>
  );
}

function MetricCard({ label, value, tone, icon: Icon, hint }) {
  const theme = {
    blue: 'metric-blue',
    green: 'metric-green',
    red: 'metric-red',
    amber: 'metric-amber',
    violet: 'metric-violet',
  }[tone] || 'metric-blue';
  return (
    <div className={'metric-card group rounded-2xl border p-4 sm:p-5 ' + theme}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-400 sm:text-[11px]">{label}</p>
        <span className="rounded-xl border border-white/5 bg-slate-950/30 p-2 text-current opacity-80"><Icon size={16} /></span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{value}</p>
        {hint && <span className="pb-1 text-[10px] text-slate-500">{hint}</span>}
      </div>
    </div>
  );
}

function ResearchCard({ project, onClick, areaName }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-w-0 w-full items-start gap-3 rounded-xl border border-slate-800/70 bg-slate-950/25 p-3 text-left transition hover:border-blue-300/20 hover:bg-slate-800/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-300/10 bg-indigo-400/10 text-indigo-300"><Atom size={17} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-100">{project.titulo || project.codigo || 'Investigación sin título'}</span>
          <Badge tone={String(project.estado).toLowerCase().includes('act') ? 'green' : 'neutral'}>{project.estado || 'Sin estado'}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{shortText(project.objetivo || project.pregunta || project.descripcion, 130)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
          {project.codigo && <span>{project.codigo}</span>}
          <span>{areaName || 'Área por asignar'}</span>
          <span>{formatDate(project.created_at)}</span>
        </div>
      </div>
      <ArrowRight size={15} className="mt-1 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-blue-300" />
    </button>
  );
}

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [semanticRelations, setSemanticRelations] = useState([]);
  const [relationEvents, setRelationEvents] = useState([]);
  const [investigators, setInvestigators] = useState([]);
  const [areas, setAreas] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeView, setActiveView] = useState('inicio');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusedGraphNodeId, setFocusedGraphNodeId] = useState(null);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setLoadError('');

    const [nodeResult, investigatorResult, areaResult, projectResult, roundResult, ideaResult, taskResult, relationResult, relationEventResult] = await Promise.all([
      supabase.from('investigaciones').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('investigadores').select('id, nombre, tipo, descripcion, estado, ultima_actividad, created_at').order('created_at', { ascending: true }),
      supabase.from('areas_arkhe').select('id, nombre, descripcion, area_padre_id, activa, created_at').eq('activa', true).order('created_at', { ascending: true }),
      supabase.from('investigaciones_proyecto').select('id, codigo, titulo, objetivo, pregunta, descripcion, area_id, estado, created_at, updated_at').order('created_at', { ascending: false }).limit(12),
      supabase.from('rondas_investigacion').select('id, numero, tipo, estado, pregunta, investigacion_id, created_at, updated_at, conclusion').order('created_at', { ascending: false }).limit(16),
      supabase.from('ideas').select('id, detalle, analisis, fecha').order('fecha', { ascending: false }).limit(12),
      supabase.from('tareas').select('id, descripcion, estado').order('id', { ascending: false }).limit(16),
      supabase.from('arkhe_semantic_relations').select('id, source_node_id, target_node_id, relation_type, assertion, evidence_text, evidence_node_id, evidence_uri, created_by_investigator_id, origin_kind, origin_channel, provider, model, run_ref, provenance, supersedes_relation_id, created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('arkhe_semantic_relation_events').select('id, relation_id, event_type, actor_investigator_id, actor_kind, event_payload, created_at').order('created_at', { ascending: false }).limit(1000),
    ]);

    if (nodeResult.error) {
      setLoadError('No fue posible cargar la red epistémica. Comprueba la conexión de Supabase y las políticas de lectura.');
      if (!quiet) setLoading(false);
      setRefreshing(false);
      return;
    }

    setNodes(nodeResult.data ?? []);
    setInvestigators(investigatorResult.error ? [] : investigatorResult.data ?? []);
    setAreas(areaResult.error ? [] : areaResult.data ?? []);
    setProjects(projectResult.error ? [] : projectResult.data ?? []);
    setRounds(roundResult.error ? [] : roundResult.data ?? []);
    setIdeas(ideaResult.error ? [] : ideaResult.data ?? []);
    setTasks(taskResult.error ? [] : taskResult.data ?? []);
    setSemanticRelations(relationResult.error ? [] : relationResult.data ?? []);
    setRelationEvents(relationEventResult.error ? [] : relationEventResult.data ?? []);

    const nonCriticalErrors = [investigatorResult, areaResult, projectResult, roundResult, ideaResult, taskResult, relationResult, relationEventResult].filter(x => x.error);
    if (nonCriticalErrors.length) setLoadError('Algunos módulos no pudieron cargarse; la red epistémica sigue disponible con los datos accesibles.');
    if (!quiet) setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    const subscription = supabase
      .channel('arkhe-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investigaciones' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arkhe_semantic_relations' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arkhe_semantic_relation_events' }, () => loadData(true))
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [loadData]);

  const metrics = useMemo(() => ({
    total: nodes.length,
    postulados: nodes.filter(node => statusKey(node.estado) === 'postulado').length,
    corroborados: nodes.filter(node => statusKey(node.estado) === 'corroborado').length,
    falsados: nodes.filter(node => statusKey(node.estado) === 'falsado').length,
    ruido: nodes.filter(node => statusKey(node.estado) === 'ruido').length,
  }), [nodes]);

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es-MX');
  const filteredNodes = useMemo(() => nodes.filter(node => {
    if (!normalizedSearch) return true;
    return [getNodeTitle(node), getNodeText(node), node.autor, node.estado, node.tipo, node.id]
      .some(value => String(value ?? '').toLocaleLowerCase('es-MX').includes(normalizedSearch));
  }), [nodes, normalizedSearch]);

  const filteredProjects = useMemo(() => projects.filter(project => {
    if (!normalizedSearch) return true;
    return [project.titulo, project.objetivo, project.pregunta, project.codigo, project.estado]
      .some(value => String(value ?? '').toLocaleLowerCase('es-MX').includes(normalizedSearch));
  }), [projects, normalizedSearch]);

  const areaMap = useMemo(() => new Map(areas.map(area => [area.id, area.nombre])), [areas]);
  const selectedArea = areas.find(area => area.id === selectedAreaId) ?? null;
  const latestNodes = filteredNodes.slice(0, 5);
  const latestProjects = filteredProjects.slice(0, 4);
  const latestRounds = rounds.slice(0, 4);
  const selectedNav = navItems.find(item => item.id === activeView) ?? navItems[0];

  const activities = useMemo(() => [
    ...nodes.slice(0, 10).map(node => ({ id: 'node-' + node.id, kind: 'node', title: getNodeTitle(node), detail: shortText(getNodeText(node), 95), date: node.created_at, state: node.estado })),
    ...rounds.slice(0, 8).map(round => ({ id: 'round-' + round.id, kind: 'round', title: 'Ronda #' + round.numero, detail: shortText(round.pregunta, 95), date: round.updated_at || round.created_at, state: round.estado })),
    ...projects.slice(0, 6).map(project => ({ id: 'project-' + project.id, kind: 'project', title: project.titulo || project.codigo, detail: shortText(project.objetivo || project.pregunta, 95), date: project.updated_at || project.created_at, state: project.estado })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 12), [nodes, rounds, projects]);

  const navigate = (view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    setSelectedNode(null);
    setFocusedGraphNodeId(null);
  };

  const openNode = (node) => {
    setSelectedNode(node);
    if (node?.id !== null && node?.id !== undefined) setFocusedGraphNodeId(String(node.id));
  };

  const quickActions = [
    { label: 'Explorar rondas', description: 'Revisa las preguntas que están en discusión.', icon: Layers, tone: 'blue', onClick: () => navigate('rondas') },
    { label: 'Investigar una idea', description: 'Encuentra aportes y preguntas relacionadas.', icon: Atom, tone: 'violet', onClick: () => navigate('investigaciones') },
    { label: 'Conocer al equipo', description: 'Consulta la identidad y el estado de cada investigador.', icon: Users, tone: 'green', onClick: () => navigate('investigadores') },
  ];

  const renderSidebar = (mobile = false) => (
    <nav className={mobile ? 'grid grid-cols-2 gap-1.5' : 'space-y-1'}>
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        const previousGroup = navItems[index - 1]?.group;
        return (
          <React.Fragment key={item.id}>
            {!mobile && item.group !== previousGroup && (
              <p className={'px-3 pb-1 pt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600 ' + (index === 0 ? '!pt-0' : '')}>{item.group}</p>
            )}
            <button
              type="button"
              onClick={() => navigate(item.id)}
              className={'flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium transition ' + (mobile ? 'w-full border ' : 'w-full ') + (active ? 'border-blue-300/15 bg-blue-500/15 text-blue-100 shadow-inner shadow-blue-950/20' : 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100')}
            >
              <Icon size={16} className={active ? 'shrink-0 text-blue-300' : 'shrink-0 text-slate-500'} />
              <span className="truncate">{item.label}</span>
              {active && !mobile && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-300" />}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );

  const renderDashboard = () => (
    <>
      <section className="hero-banner relative isolate overflow-hidden rounded-2xl border border-blue-300/15 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="hero-planet" />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-slate-950/40 px-3 py-1.5 text-[10px] font-medium text-blue-100/80 backdrop-blur">
            <Atom size={13} className="text-blue-300" /> CENTRO DE INVESTIGACIÓN
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">Arkhé Core</h1>
          <p className="mt-2 text-base font-medium text-slate-200 sm:text-lg">Un proyecto de vida para comprender, aprender y construir.</p>
          <p className="mt-2 max-w-xl text-xs leading-6 text-slate-400 sm:text-sm">Un espacio para organizar preguntas, conservar evidencia y descubrir las conexiones que hacen crecer nuestro conocimiento.</p>
        </div>
        <div className="relative z-10 mt-6 flex flex-wrap gap-2 sm:mt-7">
          <Badge tone="blue" dot>{metrics.total} nodos en la red</Badge>
          <Badge tone="green" dot>{investigators.length} investigadores registrados</Badge>
          <Badge tone="neutral" dot>{areas.length} áreas activas</Badge>
        </div>
        <div className="hero-quote relative z-10 mt-6 max-w-sm rounded-xl border border-white/10 bg-slate-950/40 p-3.5 backdrop-blur sm:absolute sm:bottom-7 sm:right-7 sm:mt-0 sm:max-w-[205px]">
          <Sparkles size={15} className="mb-2 text-blue-200" />
          <p className="text-xs leading-5 text-slate-300">“Mejores preguntas, mejores caminos.”</p>
          <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-slate-500">Principio de Arkhé</p>
        </div>
      </section>

      {loadError && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-xs leading-5 text-amber-100/80">
          <HelpCircle size={15} className="mt-0.5 shrink-0 text-amber-300" />{loadError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Total de nodos" value={loading ? '—' : metrics.total} tone="violet" icon={Network} hint="Red epistémica" />
        <MetricCard label="Postulados" value={loading ? '—' : metrics.postulados} tone="blue" icon={Sparkles} />
        <MetricCard label="Corroborados" value={loading ? '—' : metrics.corroborados} tone="green" icon={CheckCircle2} />
        <MetricCard label="Falsados" value={loading ? '—' : metrics.falsados} tone="red" icon={HelpCircle} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickActions.map(action => {
          const Icon = action.icon;
          const tone = {
            blue: 'quick-blue',
            violet: 'quick-violet',
            green: 'quick-green',
          }[action.tone];
          return (
            <button key={action.label} type="button" onClick={action.onClick} className={'quick-card group flex min-w-0 items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 sm:p-4 ' + tone}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-current"><Icon size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-100">{action.label}</span>
                <span className="mt-1 block text-[10px] leading-4 text-slate-400">{action.description}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
            </button>
          );
        })}
      </div>

      <ArkheTree areas={areas} projects={projects} selectedAreaId={selectedAreaId} onSelectArea={setSelectedAreaId} />

      <section className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel
          title="Red epistémica"
          subtitle="Explora los aportes y sus referencias. Selecciona un nodo para consultar su contenido."
          className="min-w-0"
          action={<button type="button" onClick={() => navigate('investigaciones')} className="text-[11px] text-blue-300 transition hover:text-white">Explorar red <ArrowRight size={13} className="ml-1 inline" /></button>}
        >
          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-2 text-[10px] text-slate-400">
            {Object.entries(statusLabels).map(([key, label]) => (
              <span key={key} className="inline-flex items-center gap-1.5"><span className={'h-1.5 w-1.5 rounded-full ' + ({ postulado: 'bg-blue-400', corroborado: 'bg-emerald-400', falsado: 'bg-rose-400', ruido: 'bg-amber-400' })[key]} />{label}</span>
            ))}
          </div>
          {loading && nodes.length === 0 ? (
            <div className="flex h-64 items-center justify-center gap-2 text-xs text-slate-500"><RefreshCw size={14} className="animate-spin" />Cargando grafo…</div>
          ) : (
            <KnowledgeGraph nodesData={nodes} semanticRelations={semanticRelations} relationEvents={relationEvents} onNodeSelect={openNode} focusNodeId={focusedGraphNodeId} />
          )}
        </Panel>

        <Panel title="Investigadores" subtitle="Identidad y estado registrados en Arkhé." action={<button type="button" onClick={() => navigate('investigadores')} className="text-[11px] text-blue-300 hover:text-white">Ver todos <ArrowRight size={13} className="ml-1 inline" /></button>}>
          {investigators.length === 0 ? <EmptyState title="Sin investigadores disponibles" description="No se pudieron cargar los registros del equipo." /> : (
            <div className="space-y-2">
              {investigators.slice(0, 4).map((investigator, index) => (
                <button key={investigator.id} type="button" onClick={() => navigate('investigadores')} className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-slate-700 hover:bg-slate-800/45">
                  <InvestigatorAvatar investigator={investigator} index={index} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 truncate text-xs font-medium text-slate-100">{investigator.nombre}<StateIndicator state={investigator.estado} /></span>
                    <span className="mt-1 block truncate text-[10px] text-slate-500">{investigator.tipo === 'humano' ? 'Investigador humano' : 'Investigador de IA'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{investigator.estado || 'Sin estado'}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300"><ShieldCheckIcon /> Identidad antes que motor</div>
            <p className="mt-1.5 text-[10px] leading-5 text-slate-500">Cada investigador conserva su función, independientemente del modelo que pueda utilizar.</p>
          </div>
        </Panel>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <Panel title="Investigaciones recientes" subtitle="Proyectos y preguntas registrados en el núcleo." action={<button type="button" onClick={() => navigate('investigaciones')} className="text-[11px] text-blue-300 hover:text-white">Ver todas <ArrowRight size={13} className="ml-1 inline" /></button>}>
          {latestProjects.length === 0 ? (
            <EmptyState title="Aún no hay proyectos accesibles" description="Los aportes de la red siguen disponibles en Investigaciones." />
          ) : <div className="space-y-2">{latestProjects.map(project => <ResearchCard key={project.id} project={project} areaName={areaMap.get(project.area_id)} onClick={() => navigate('investigaciones')} />)}</div>}
        </Panel>
        <Panel title="Rondas recientes" subtitle="Preguntas en curso y rondas de investigación." action={<button type="button" onClick={() => navigate('rondas')} className="text-[11px] text-blue-300 hover:text-white">Ver todas <ArrowRight size={13} className="ml-1 inline" /></button>}>
          {latestRounds.length === 0 ? <EmptyState title="No hay rondas registradas" description="Cuando existan rondas, aparecerán aquí con su estado." /> : <div className="space-y-1">{latestRounds.map(round => <RoundRow key={round.id} round={round} onClick={() => navigate('rondas')} />)}</div>}
        </Panel>
      </section>

      <Panel title="Actividad reciente" subtitle="Una cronología de los elementos más recientes que tienen fecha registrada." action={<button type="button" onClick={() => navigate('actividad')} className="text-[11px] text-blue-300 hover:text-white">Abrir actividad <ArrowRight size={13} className="ml-1 inline" /></button>}>
        <ActivityTimeline activities={activities.slice(0, 5)} onSelectActivity={activity => activity.kind === 'round' ? navigate('rondas') : activity.kind === 'project' ? navigate('investigaciones') : openNode(nodes.find(node => 'node-' + node.id === activity.id))} />
      </Panel>
    </>
  );

  const renderInvestigations = () => (
    <>
      <SectionHeading eyebrow="Exploración" title="Investigaciones" description="Aportes, postulados y proyectos que forman parte de la red de conocimiento." right={<Badge tone="blue" dot>{filteredNodes.length} aportes visibles</Badge>} />
      <Panel title="Proyectos del núcleo" subtitle="Registros de investigaciones con objetivos, preguntas y estado.">
        {filteredProjects.length ? <div className="grid gap-2 lg:grid-cols-2">{filteredProjects.map(project => <ResearchCard key={project.id} project={project} areaName={areaMap.get(project.area_id)} onClick={() => setSelectedNode({ ...project, id: project.id, tipo: 'Proyecto', contenido: project.pregunta || project.objetivo })} />)}</div> : <EmptyState title="Sin proyectos coincidentes" description="Prueba con otras palabras o limpia la búsqueda." />}
      </Panel>
      <Panel title="Aportes de la red" subtitle="Selecciona cualquier registro para revisar su contenido completo." action={<Badge tone="neutral">{filteredNodes.length} registros</Badge>}>
        {filteredNodes.length ? <div className="divide-y divide-slate-800/70">{filteredNodes.map(node => <NodeRow key={node.id} node={node} onClick={openNode} />)}</div> : <EmptyState title="No hay aportes coincidentes" description="Cambia los términos de búsqueda." />}
      </Panel>
    </>
  );

  const renderInvestigators = () => (
    <>
      <SectionHeading eyebrow="Personas y funciones" title="Investigadores" description="La identidad del investigador no se confunde con el motor de IA que utiliza." right={<Badge tone="green" dot>{investigators.length} registrados</Badge>} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {investigators.map((investigator, index) => (
          <Panel key={investigator.id} className="investigator-card" >
            <div className="flex items-start gap-3">
              <InvestigatorAvatar investigator={investigator} index={index} />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-white">{investigator.nombre}</h2>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">{investigator.tipo === 'humano' ? 'Gobierno humano' : 'Investigador de IA'}</p>
                <div className="mt-2"><Badge tone={String(investigator.estado).toLowerCase().includes('dispon') ? 'green' : 'neutral'} dot>{investigator.estado || 'Sin estado'}</Badge></div>
              </div>
            </div>
            <p className="mt-4 min-h-12 text-xs leading-6 text-slate-400">{investigator.descripcion || 'Sin descripción registrada.'}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[10px] text-slate-600">
              <span>Alta: {formatDate(investigator.created_at)}</span>
              <span className="inline-flex items-center gap-1"><StateIndicator state={investigator.estado} />Estado registrado</span>
            </div>
          </Panel>
        ))}
      </div>
      <Panel title="Principio de separación" subtitle="Una misma identidad de investigador puede operar a través de distintos motores sin transferirles su autoridad.">
        <div className="grid gap-3 sm:grid-cols-3">
          {[{icon: Users, title:'Identidad', text:'Quién participa y qué función tiene en la investigación.'},{icon: Network,title:'Método',text:'Cómo se discute, contrasta y conecta el conocimiento.'},{icon: Boxes,title:'Motor',text:'Qué herramienta genera una respuesta, sin convertirse en el investigador.'}].map(item => {
            const Icon = item.icon;
            return <div key={item.title} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4"><Icon size={17} className="mb-3 text-blue-300" /><h3 className="text-xs font-semibold text-slate-200">{item.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{item.text}</p></div>;
          })}
        </div>
      </Panel>
    </>
  );

  const renderRounds = () => (
    <>
      <SectionHeading eyebrow="Investigación colaborativa" title="Rondas" description="Consulta las preguntas, estado y fecha de las rondas registradas. La apertura o modificación de rondas se mantiene fuera de esta interfaz visual." right={<Badge tone="blue" dot>{rounds.length} recientes</Badge>} />
      <Panel title="Rondas registradas" subtitle="La información se presenta tal como está guardada en Supabase.">
        {rounds.length ? <div className="grid gap-2 lg:grid-cols-2">{rounds.map(round => <RoundRow key={round.id} round={round} />)}</div> : <EmptyState title="Todavía no hay rondas accesibles" description="Las rondas aparecerán aquí cuando existan registros disponibles." />}
      </Panel>
    </>
  );

  const renderAreas = () => (
    <>
      <SectionHeading eyebrow="Estructura de Arkhé" title="Árbol del proyecto" description="El árbol organiza las áreas; la red epistémica conecta las ideas, las referencias y la evidencia." right={<Badge tone="green" dot>{areas.length} áreas activas</Badge>} />
      <ArkheTree areas={areas} projects={projects} selectedAreaId={selectedAreaId} onSelectArea={setSelectedAreaId} />
      {selectedArea && <Panel title={selectedArea.nombre} subtitle={selectedArea.descripcion || 'Sin descripción registrada.'}>
        <p className="text-xs leading-6 text-slate-400">Proyectos vinculados en los registros consultados: {projects.filter(project => project.area_id === selectedArea.id).length}. Los aportes de la tabla de nodos no tienen un vínculo de área en el esquema actual, por lo que no se atribuyen automáticamente.</p>
      </Panel>}
      <Panel title="Conexiones entre aportes" subtitle="La red mantiene su estructura propia: los vínculos proceden de las referencias registradas entre nodos."><KnowledgeGraph nodesData={nodes} semanticRelations={semanticRelations} relationEvents={relationEvents} onNodeSelect={openNode} focusNodeId={focusedGraphNodeId} /></Panel>
    </>
  );

  const renderActivity = () => (
    <>
      <SectionHeading eyebrow="Trazabilidad" title="Actividad" description="Cronología construida a partir de los registros y fechas que realmente existen en el sistema." />
      <Panel title="Últimos movimientos registrados">
        {activities.length ? <ActivityTimeline activities={activities} onSelectActivity={activity => activity.kind === 'round' ? navigate('rondas') : activity.kind === 'project' ? navigate('investigaciones') : openNode(nodes.find(node => 'node-' + node.id === activity.id))} /> : <EmptyState title="Sin actividad disponible" description="No hay elementos con datos suficientes para formar una cronología." />}
      </Panel>
    </>
  );

  const renderResources = () => (
    <>
      <SectionHeading eyebrow="Biblioteca de trabajo" title="Recursos" description="Ideas y tareas almacenadas en el proyecto. Este panel es de consulta y no modifica los registros." />
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Ideas recientes" subtitle="Notas y análisis registrados.">
          {ideas.length ? <div className="space-y-2">{ideas.map(idea => <article key={idea.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><div className="flex items-center justify-between gap-2"><Badge tone="violet">Idea #{idea.id}</Badge><span className="text-[10px] text-slate-600">{formatDate(idea.fecha)}</span></div><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-300">{shortText(idea.detalle, 320)}</p>{idea.analisis && <p className="mt-2 whitespace-pre-wrap border-t border-slate-800 pt-2 text-xs leading-6 text-slate-500">{shortText(idea.analisis, 320)}</p>}</article>)}</div> : <EmptyState title="No hay ideas disponibles" description="No se encontraron registros accesibles en la tabla de ideas." />}
        </Panel>
        <Panel title="Tareas" subtitle="Estado de los elementos de trabajo.">
          {tasks.length ? <div className="space-y-2">{tasks.map(task => <div key={task.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3"><div className="mt-0.5 rounded-lg border border-blue-300/10 bg-blue-400/10 p-2 text-blue-300"><CheckCircle2 size={15} /></div><div className="min-w-0 flex-1"><p className="text-xs leading-5 text-slate-200">{task.descripcion}</p><div className="mt-2"><Badge tone={String(task.estado).toLowerCase().includes('complet') ? 'green' : 'neutral'}>{task.estado || 'Sin estado'}</Badge></div></div></div>)}</div> : <EmptyState title="No hay tareas disponibles" description="No se encontraron tareas accesibles en la tabla correspondiente." />}
        </Panel>
      </div>
    </>
  );

  const renderSettings = () => (
    <>
      <SectionHeading eyebrow="Sistema" title="Configuración" description="Estado de lectura de datos y detalles de esta interfaz." />
      <Panel title="Conexión de datos" subtitle="La interfaz consulta Supabase con las claves públicas de cliente y respeta las políticas de lectura configuradas en el proyecto.">
        <div className="space-y-3">
          {[{label:'Red epistémica', detail: nodes.length + ' aportes cargados', ok: !loading && !loadError},{label:'Investigadores', detail:investigators.length+' identidades registradas', ok:investigators.length>0},{label:'Áreas',detail:areas.length+' áreas accesibles',ok:areas.length>0},{label:'Rondas',detail:rounds.length+' rondas consultadas',ok:true}].map(item => <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3"><span className={'flex h-8 w-8 items-center justify-center rounded-lg ' + (item.ok ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300')}>{item.ok ? <CheckCircle2 size={15} /> : <HelpCircle size={15} />}</span><div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-200">{item.label}</p><p className="mt-0.5 text-[10px] text-slate-500">{item.detail}</p></div></div>)}
        </div>
        <button type="button" onClick={() => loadData(true)} disabled={refreshing} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:border-blue-300/30 hover:bg-slate-800 disabled:opacity-50"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />Actualizar datos</button>
      </Panel>
      <Panel title="Límites de esta versión" subtitle="Esta rama renueva la visualización sin cambiar reglas de gobernanza, autenticación, políticas RLS ni procedimientos de escritura.">
        <ul className="space-y-2 text-xs leading-6 text-slate-400">
          <li className="flex gap-2"><span className="text-emerald-300">✓</span>Lectura de investigaciones, áreas, investigadores, rondas, ideas y tareas.</li>
          <li className="flex gap-2"><span className="text-emerald-300">✓</span>Grafo seleccionable y navegación entre módulos.</li>
          <li className="flex gap-2"><span className="text-amber-300">•</span>Las acciones de gobierno y autenticación permanecen separadas para su integración desde la auditoría A.4.</li>
        </ul>
      </Panel>
    </>
  );

  const selectedNodeConnections = selectedNode ? getNodeConnections(selectedNode, nodes, semanticRelations, relationEvents) : [];
  const modalOpen = Boolean(selectedNode);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const body = document.body;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const previousBody = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const previousRootOverflow = root.style.overflow;

    // iOS Safari otherwise lets touch scrolling escape the modal into the page below.
    body.style.position = 'fixed';
    body.style.top = '-' + scrollY + 'px';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';

    const handleKeyDown = event => {
      if (event.key === 'Escape') setSelectedNode(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      body.style.position = previousBody.position;
      body.style.top = previousBody.top;
      body.style.width = previousBody.width;
      body.style.overflow = previousBody.overflow;
      root.style.overflow = previousRootOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [modalOpen]);

  const viewRenderers = {
    inicio: renderDashboard,
    investigaciones: renderInvestigations,
    investigadores: renderInvestigators,
    rondas: renderRounds,
    actividad: renderActivity,
    areas: renderAreas,
    recursos: renderResources,
    configuracion: renderSettings,
  };

  return (
    <div className="app-shell min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1720px]">
        <aside className="sidebar hidden w-[232px] shrink-0 flex-col border-r border-slate-800/80 px-4 py-5 lg:flex">
          <button type="button" onClick={() => navigate('inicio')} className="mb-9 flex items-center gap-3 px-2 text-left">
            <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-300"><TreePine size={23} /></div>
            <span><span className="block text-sm font-semibold tracking-wide text-white">Arkhé Core</span><span className="mt-0.5 block text-[10px] text-slate-500">Centro de Investigación</span></span>
          </button>
          {renderSidebar(false)}
          <div className="sidebar-note mt-auto overflow-hidden rounded-2xl border border-slate-800/80 p-4">
            <div className="mb-3 flex items-center justify-between"><TreePine size={21} className="text-blue-300/80" /><span className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Arkhé</span></div>
            <p className="text-xs font-medium text-slate-200">Mejores preguntas, mejores caminos.</p>
            <p className="mt-2 text-[10px] leading-5 text-slate-500">Conocimiento · Aprendizaje · Economía · Tecnología</p>
            <div className="mt-4 flex items-center gap-1.5">{[0,1,2,3,4].map(i => <span key={i} className="h-1 flex-1 rounded-full bg-gradient-to-r from-blue-400/70 to-violet-400/50" />)}</div>
          </div>
          <p className="mt-4 px-2 text-[9px] text-slate-700">Arkhé Core · espacio de investigación</p>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="topbar sticky top-0 z-30 flex min-h-[70px] items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileMenuOpen(v => !v)} className="rounded-xl border border-slate-700/80 p-2 text-slate-300 lg:hidden" aria-label="Abrir navegación">{mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}</button>
              <div className="min-w-0 lg:hidden"><p className="truncate text-sm font-semibold text-white">Arkhé Core</p><p className="text-[9px] text-slate-500">Centro de Investigación</p></div>
              <div className="relative hidden w-full max-w-[470px] md:block">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar investigaciones, aportes, estados…" aria-label="Buscar en Arkhé" className="search-input h-10 w-full rounded-full border border-slate-700/70 bg-slate-950/40 pl-10 pr-10 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-300/30 focus:ring-2 focus:ring-blue-400/5" />
                {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={14} /></button>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button type="button" onClick={() => navigate('actividad')} aria-label="Ver actividad reciente" className="relative rounded-xl border border-slate-700/60 bg-slate-900/60 p-2.5 text-slate-400 transition hover:text-white"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-300" /></button>
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/20 bg-amber-400/10 text-xs font-semibold text-amber-100">Á</div>
                <div><p className="text-xs font-medium text-slate-100">Ángel</p><p className="mt-0.5 text-[10px] text-slate-500">Investigador humano</p></div>
                <ChevronDown size={14} className="ml-2 text-slate-500" />
              </div>
            </div>
          </header>

          {mobileMenuOpen && <div className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 lg:hidden"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Navegación</p><span className="text-[10px] text-slate-600">{selectedNav.label}</span></div>{renderSidebar(true)}</div>}

          <div className="border-b border-slate-800/40 px-4 py-3 md:hidden">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar en Arkhé…" aria-label="Buscar en Arkhé" className="search-input h-10 w-full rounded-full border border-slate-700/70 bg-slate-950/50 pl-10 pr-9 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-300/30" />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X size={13} /></button>}
            </div>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Espacio de investigación <ChevronRight size={12} /><span className="text-slate-300">{selectedNav.label}</span></div>
              <button type="button" onClick={() => loadData(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[10px] text-slate-400 transition hover:border-slate-600 hover:text-white disabled:opacity-50"><RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />Actualizar</button>
            </div>
            {(viewRenderers[activeView] || renderDashboard)()}
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-4 text-[9px] text-slate-700">
              <span>Arkhé Core · Centro de Investigación</span>
              <span className="inline-flex items-center gap-1.5"><Database size={10} />Datos consultados desde Supabase</span>
            </footer>
          </div>
        </main>
      </div>

      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onClick={e => { if (e.target === e.currentTarget) setSelectedNode(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="node-dialog-title" className="w-full max-h-[92dvh] max-w-2xl overflow-y-auto overscroll-contain touch-pan-y rounded-t-2xl border border-slate-700 bg-slate-950 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/40 sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.2em] text-blue-300">Detalle del registro</p><h2 id="node-dialog-title" className="mt-2 text-lg font-semibold text-white">{getNodeTitle(selectedNode)}</h2><p className="mt-1 text-[10px] text-slate-500">ID: {selectedNode.id} · {formatDate(selectedNode.created_at)}</p></div>
              <button type="button" onClick={() => setSelectedNode(null)} aria-label="Cerrar detalle" className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm leading-7 text-slate-300 whitespace-pre-wrap break-words">{getNodeText(selectedNode) || selectedNode.objetivo || selectedNode.pregunta || selectedNode.descripcion || 'Este registro no contiene texto adicional.'}</div>
            {selectedNode.estado && <div className="mt-4"><Badge tone={statusColors[statusKey(selectedNode.estado)]}>{selectedNode.estado}</Badge></div>}
            {selectedNode.dictamen_aletheia && <div className="mt-4"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Dictamen Aletheia</p><p className="mt-2 text-xs leading-6 text-slate-400">{selectedNode.dictamen_aletheia}</p></div>}
            <section className="mt-5 border-t border-slate-800 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">Conexiones de este nodo</h3>
                  <p className="mt-1 max-w-lg text-[10px] leading-5 text-slate-500">Solo se muestran vínculos presentes en referencias o metadatos estructurados. La interfaz no infiere relaciones científicas a partir del texto.</p>
                </div>
                <Badge tone="neutral">{selectedNodeConnections.length} vínculos</Badge>
              </div>
              {selectedNodeConnections.length ? (
                <div className="mt-3 space-y-2">
                  {selectedNodeConnections.map(connection => (
                    <article key={connection.id} className="rounded-xl border border-slate-800 bg-slate-900/45 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone={connection.kind === 'semantic' ? (connection.type === 'contradicts' ? 'red' : connection.type === 'supports' ? 'green' : 'violet') : 'blue'}>{connection.label}</Badge>
                        <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600">{connection.direction === 'outgoing' ? 'Salida' : connection.direction === 'incoming' ? 'Entrada' : 'Autorreferencia'}</span>
                      </div>
                      {connection.direction === 'self' ? (
                        <p className="mt-2 text-[10px] leading-5 text-amber-200/80">Este registro se referencia a sí mismo en los datos. Se conserva para inspección, pero se omite como bucle en la visualización.</p>
                      ) : connection.neighborNode ? (
                        <button type="button" onClick={() => openNode(connection.neighborNode)} className="mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800/80 px-3 py-2 text-left transition hover:border-blue-300/20 hover:bg-slate-800/50">
                          <span className="min-w-0"><span className="block text-[11px] font-medium text-slate-200">#{connection.neighborNode.id} · {getNodeTitle(connection.neighborNode)}</span><span className="mt-1 block text-[9px] text-slate-500">{connection.direction === 'outgoing' ? 'Este registro apunta hacia el nodo vinculado.' : 'Este registro es mencionado como destino de otro nodo.'}</span></span>
                          <ChevronRight size={14} className="shrink-0 text-slate-500" />
                        </button>
                      ) : (
                        <p className="mt-2 text-[10px] leading-5 text-amber-200/80">Destino #{connection.neighborId}: el registro no está incluido en los datos cargados, por lo que no se dibuja un nodo inventado.</p>
                      )}
                      {connection.assertion && <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-300"><span className="text-slate-500">Afirmación: </span>{connection.assertion}</p>}
                      {connection.evidence && <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-slate-400"><span className="text-slate-500">Evidencia / fundamento declarado: </span>{connection.evidence}</p>}
                      {connection.evidenceNodeId && (
                        <div className="mt-2 text-[10px]">
                          {nodes.some(item => String(item.id) === String(connection.evidenceNodeId)) ? (
                            <button type="button" onClick={() => { const evidenceNode = nodes.find(item => String(item.id) === String(connection.evidenceNodeId)); if (evidenceNode) openNode(evidenceNode); }} className="text-blue-300 underline underline-offset-2 hover:text-white">Abrir nodo de evidencia #{connection.evidenceNodeId}</button>
                          ) : <span className="text-slate-500">Nodo de evidencia registrado: #{connection.evidenceNodeId}</span>}
                        </div>
                      )}
                      {connection.evidenceUri && <a href={connection.evidenceUri} target="_blank" rel="noreferrer" className="mt-2 block break-all text-[10px] text-blue-300 underline underline-offset-2">Consultar fuente externa</a>}
                      {connection.relationId && (
                        <div className="mt-3 grid gap-1.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[10px] text-slate-500">
                          <p><span className="text-slate-400">ID de relación: </span><code className="break-all">{connection.relationId}</code></p>
                          <p><span className="text-slate-400">Estado de revisión: </span>{connection.reviewLabel || 'Propuesta'}</p>
                          <p><span className="text-slate-400">Origen: </span>{connection.originKind || 'No especificado'}{connection.originChannel ? ' · ' + connection.originChannel : ''}</p>
                          {connection.createdByInvestigatorId && <p><span className="text-slate-400">Registrada por: </span>{investigators.find(person => person.id === connection.createdByInvestigatorId)?.nombre || connection.createdByInvestigatorId}</p>}
                          {connection.createdAt && <p><span className="text-slate-400">Fecha: </span>{formatDate(connection.createdAt, true)}</p>}
                          {(connection.provider || connection.model || connection.runRef) && <p><span className="text-slate-400">Procedencia técnica: </span>{[connection.provider, connection.model, connection.runRef].filter(Boolean).join(' · ')}</p>}
                          {connection.supersedesRelationId && <p><span className="text-slate-400">Sustituye a: </span><code className="break-all">{connection.supersedesRelationId}</code></p>}
                        </div>
                      )}
                      {connection.provenance && Object.keys(connection.provenance).length > 0 && (
                        <details className="mt-2 rounded-lg border border-slate-800/80 px-3 py-2">
                          <summary className="cursor-pointer text-[10px] text-slate-400">Detalles de procedencia</summary>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[9px] leading-4 text-slate-500">{JSON.stringify(connection.provenance, null, 2)}</pre>
                        </details>
                      )}
                      {connection.events?.length > 0 && (
                        <details className="mt-2 rounded-lg border border-slate-800/80 px-3 py-2">
                          <summary className="cursor-pointer text-[10px] text-slate-400">Historial ({connection.events.length} eventos)</summary>
                          <ol className="mt-2 space-y-2">
                            {connection.events.slice(-6).reverse().map(event => (
                              <li key={event.id} className="border-l border-slate-700 pl-2.5 text-[10px] leading-4">
                                <span className="text-slate-300">{String(event.event_type || '').replaceAll('_', ' ')}</span>
                                <span className="block text-slate-600">{formatDate(event.created_at, true)} · {investigators.find(person => person.id === event.actor_investigator_id)?.nombre || event.actor_kind || 'Actor no especificado'}</span>
                                {event.event_payload?.note && <span className="mt-1 block text-slate-500">{event.event_payload.note}</span>}
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                      <p className="mt-3 text-[9px] leading-4 text-slate-600">{connection.kind === 'reference' ? 'Referencia explícita; su significado semántico no está especificado.' : connection.reviewStatus === 'reviewed' ? 'La relación consta como revisada; esto no equivale a una verificación científica independiente.' : connection.reviewStatus === 'disputed' ? 'Existe un evento que marca esta relación como discutida; consulta el historial antes de utilizarla.' : connection.reviewStatus === 'rejected' ? 'Esta relación fue rechazada en el historial y se conserva para trazabilidad.' : connection.reviewStatus === 'superseded' ? 'Esta relación fue sustituida por una versión posterior; se conserva para trazabilidad.' : connection.metadataOrigin ? 'Relación declarada en metadatos heredados; su evidencia y procedencia pueden no estar normalizadas.' : 'Afirmación semántica registrada como propuesta; aún no consta una revisión posterior.'}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-800 px-3 py-4 text-[10px] leading-5 text-slate-500">No hay conexiones explícitas disponibles para este registro en el conjunto cargado. Eso no demuestra que no exista una relación conceptual.</div>
              )}
            </section>
            <div className="mt-5 flex justify-end"><button type="button" onClick={() => setSelectedNode(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800">Cerrar</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function ShieldCheckIcon() {
  return <CheckCircle2 size={14} className="text-emerald-300" />;
}

function ActivityTimeline({ activities, onSelectActivity }) {
  if (!activities.length) return <EmptyState title="Sin actividad disponible" description="Todavía no hay registros suficientes para crear una cronología." />;
  return (
    <div className="relative">
      <div className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-blue-300/40 via-violet-300/20 to-transparent" />
      <div className="space-y-1">
        {activities.map((activity, index) => {
          const isNode = activity.kind === 'node';
          const isRound = activity.kind === 'round';
          const Icon = isNode ? FileText : isRound ? Layers : Atom;
          const dotClass = isNode ? 'text-blue-300 border-blue-300/20 bg-blue-400/10' : isRound ? 'text-violet-300 border-violet-300/20 bg-violet-400/10' : 'text-emerald-300 border-emerald-300/20 bg-emerald-400/10';
          return (
            <button key={activity.id} type="button" onClick={() => onSelectActivity?.(activity)} className="relative flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-800/35">
              <span className={'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ' + dotClass}><Icon size={14} /></span>
              <span className="min-w-0 flex-1 py-0.5"><span className="block text-xs font-medium text-slate-200">{activity.title}</span><span className="mt-1 block text-[10px] leading-5 text-slate-500">{activity.detail}</span></span>
              <span className="shrink-0 pt-1 text-[9px] text-slate-600">{formatDate(activity.date, true)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
