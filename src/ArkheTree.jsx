import React from 'react';
import { ArrowDownRight, ArrowRight, GitBranch, Sprout, TreePine } from 'lucide-react';

const branchTones = [
  { line: '#72a7ff', text: 'text-blue-200', soft: 'bg-blue-400/10', border: 'border-blue-300/20' },
  { line: '#b7a0ff', text: 'text-violet-200', soft: 'bg-violet-400/10', border: 'border-violet-300/20' },
  { line: '#59d6a6', text: 'text-emerald-200', soft: 'bg-emerald-400/10', border: 'border-emerald-300/20' },
  { line: '#f6c56a', text: 'text-amber-200', soft: 'bg-amber-400/10', border: 'border-amber-300/20' },
  { line: '#fb95b4', text: 'text-rose-200', soft: 'bg-rose-400/10', border: 'border-rose-300/20' },
  { line: '#6bd6e8', text: 'text-cyan-200', soft: 'bg-cyan-400/10', border: 'border-cyan-300/20' },
  { line: '#9cb8a7', text: 'text-teal-200', soft: 'bg-teal-400/10', border: 'border-teal-300/20' },
];

export default function ArkheTree({ areas = [], projects = [], selectedAreaId = null, onSelectArea }) {
  const selectedArea = areas.find(area => area.id === selectedAreaId) ?? null;
  const linkedProjects = selectedArea ? projects.filter(project => project.area_id === selectedArea.id) : [];
  const totalLinkedProjects = projects.filter(project => project.area_id).length;

  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-5 sm:px-5">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/80">Estructura del proyecto</p>
          <h2 className="text-sm font-semibold text-slate-100 sm:text-base">El árbol de Arkhé</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">Un tronco común, raíces documentadas y ramas que sostienen diferentes dimensiones de la vida e investigación.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-950/40 px-2.5 py-1.5 text-[10px] text-slate-400"><GitBranch size={12} className="text-blue-300" />{areas.length} ramas activas</span>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:p-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="tree-illustration relative flex min-h-[270px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/80 p-4 sm:min-h-[310px] sm:p-5">
          <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(50,101,170,.18), transparent 60%), linear-gradient(180deg, rgba(7,18,36,.15), rgba(2,8,21,.62))' }} />
          <svg className="absolute inset-x-2 top-0 h-[76%] w-[calc(100%-1rem)]" viewBox="0 0 360 260" role="img" aria-label="Ilustración conceptual del árbol de Arkhé">
            <defs>
              <linearGradient id="arkheTrunk" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#d0a56e" stopOpacity=".7" />
                <stop offset="100%" stopColor="#6b9eea" stopOpacity=".9" />
              </linearGradient>
              <filter id="arkheGlow"><feGaussianBlur stdDeviation="2.8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <g fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#arkheGlow)">
              <path d="M180 231 C177 185 184 146 180 103 C178 80 171 62 180 35" stroke="url(#arkheTrunk)" strokeWidth="5" />
              <path d="M179 145 C154 130 141 111 125 85 C115 70 102 64 92 53" stroke="#75a8f4" strokeWidth="2.6" />
              <path d="M181 126 C204 112 220 93 232 72 C241 57 254 51 270 45" stroke="#7e9bfa" strokeWidth="2.6" />
              <path d="M179 166 C155 155 132 149 105 145 C87 141 72 131 58 115" stroke="#84b9e9" strokeWidth="2.2" />
              <path d="M182 160 C211 149 237 145 259 128 C273 118 287 106 299 92" stroke="#66d4c4" strokeWidth="2.2" />
              <path d="M179 99 C160 87 154 69 153 50" stroke="#91b9f6" strokeWidth="2" />
              <path d="M184 106 C201 94 210 72 211 52" stroke="#9f9aff" strokeWidth="2" />
              <path d="M177 228 C161 219 152 207 137 200 C124 194 111 192 99 186" stroke="#c7a77b" strokeWidth="2" />
              <path d="M180 228 C199 217 217 208 231 198 C242 190 256 188 270 184" stroke="#c7a77b" strokeWidth="2" />
              <path d="M180 229 C174 213 173 199 174 184" stroke="#c7a77b" strokeWidth="1.8" />
              <path d="M181 229 C188 214 191 205 194 192" stroke="#c7a77b" strokeWidth="1.8" />
              <path d="M180 229 C157 229 142 233 125 242" stroke="#c7a77b" strokeWidth="1.4" />
              <path d="M180 229 C200 229 214 235 230 242" stroke="#c7a77b" strokeWidth="1.4" />
            </g>
            {[
              [92,53,'#75a8f4'],[270,45,'#7e9bfa'],[58,115,'#84b9e9'],[299,92,'#66d4c4'],
              [153,50,'#91b9f6'],[211,52,'#9f9aff'],[105,145,'#84b9e9'],[259,128,'#66d4c4'],
              [180,35,'#9abfff'],[137,200,'#d0aa7b'],[270,184,'#d0aa7b']
            ].map(([x,y,color],i) => <circle key={i} cx={x} cy={y} r={i<8?3.4:2.5} fill={color} opacity=".92" />)}
          </svg>
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/15 bg-slate-950/50 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.16em] text-blue-100/80"><TreePine size={12} /> Tronco común</span>
            <span className="text-[9px] text-slate-600">01 / Estructura</span>
          </div>
          <div className="relative z-10 mt-auto pt-44 sm:pt-48">
            <p className="text-lg font-semibold tracking-tight text-white">Comprender.</p>
            <p className="text-lg font-semibold tracking-tight text-white">Aprender. Construir.</p>
            <p className="mt-2 max-w-xs text-[10px] leading-5 text-slate-400">El tronco sostiene el propósito; las raíces y ramas conservan sus relaciones, sin confundir una hipótesis con una conclusión.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Preguntas','Evidencia','Método'].map(root => <span key={root} className="rounded-full border border-amber-200/10 bg-amber-300/5 px-2 py-1 text-[9px] text-amber-100/60">{root}</span>)}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ramas del proyecto</p>
            <span className="text-[9px] text-slate-600">{totalLinkedProjects} proyectos con área asignada</span>
          </div>
          {areas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">No se pudieron cargar las áreas del proyecto.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
              {areas.map((area,index) => {
                const tone = branchTones[index % branchTones.length];
                const active = selectedAreaId === area.id;
                const count = projects.filter(project => project.area_id === area.id).length;
                return (
                  <button key={area.id} type="button" onClick={() => onSelectArea?.(active ? null : area.id)} aria-pressed={active} className={'branch-card group flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition ' + (active ? tone.soft + ' ' + tone.border : 'border-slate-800/80 bg-slate-950/25 hover:border-slate-600')}>
                    <span className={'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ' + tone.soft + ' ' + tone.border + ' ' + tone.text}><Sprout size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={'block truncate text-xs font-semibold ' + (active ? tone.text : 'text-slate-200')}>{area.nombre}</span>
                      <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-slate-500">{area.descripcion || 'Área activa del proyecto Arkhé.'}</span>
                      <span className="mt-2 flex items-center gap-1 text-[9px] text-slate-600">{count} proyectos <ArrowRight size={10} className="transition group-hover:translate-x-0.5" /></span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {selectedArea && (
            <div className="mt-3 rounded-xl border border-blue-300/15 bg-blue-400/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold text-blue-100">{selectedArea.nombre}</p><p className="mt-1 text-[10px] leading-5 text-slate-400">{selectedArea.descripcion || 'Sin descripción registrada.'}</p></div>
                <button type="button" onClick={() => onSelectArea?.(null)} className="rounded-md p-1 text-slate-500 hover:text-white" aria-label="Quitar selección">×</button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-500"><ArrowDownRight size={12} />{linkedProjects.length} proyectos vinculados explícitamente por area_id.</div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800/70 px-4 py-3 text-[9px] text-slate-600 sm:px-5">
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-300" />Árbol: organización</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-300" />Red: relaciones entre aportes</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />Raíces: principios y evidencia</span>
      </div>
    </section>
  );
}
