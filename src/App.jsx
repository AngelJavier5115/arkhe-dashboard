import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Activity, ShieldCheck, AlertTriangle, Radio, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

// Se obtienen las credenciales desde variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [investigaciones, setInvestigaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetchInvestigaciones();

    // Suscripción en tiempo real a la tabla investigaciones
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'investigaciones' },
        () => {
          fetchInvestigaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchInvestigaciones() {
    const { data, error } = await supabase
      .from('investigaciones')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      setInvestigaciones(data);
    }
    setLoading(false);
  }

  // Métricas rápidas
  const total = investigaciones.length;
  const corroborados = investigaciones.filter(i => i.estado === 'corroborado').length;
  const falsados = investigaciones.filter(i => i.estado === 'falsado').length;
  const ruido = investigaciones.filter(i => i.estado === 'ruido').length;
  const postulados = investigaciones.filter(i => i.estado === 'postulado' || i.estado === 'en_revision').length;

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'corroborado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Corroborado</span>;
      case 'falsado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"><XCircle className="w-3 h-3" /> Falsado</span>;
      case 'ruido':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertTriangle className="w-3 h-3" /> Ruido</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><HelpCircle className="w-3 h-3" /> Postulado</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PROYECTO ARKHÉ</h1>
            <p className="text-xs text-slate-400">Red Epistémica & Dashboard de Nodos en Tiempo Real</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-slate-300 font-medium">Nodo Aletheia: Online</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <p className="text-xs text-slate-400 uppercase font-semibold">Total Nodos</p>
            <p className="text-2xl font-bold mt-1">{total}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <p className="text-xs text-blue-400 uppercase font-semibold">Postulados</p>
            <p className="text-2xl font-bold mt-1 text-blue-400">{postulados}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <p className="text-xs text-emerald-400 uppercase font-semibold">Corroborados</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">{corroborados}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <p className="text-xs text-rose-400 uppercase font-semibold">Falsados</p>
            <p className="text-2xl font-bold mt-1 text-rose-400">{falsados}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl col-span-2 md:col-span-1">
            <p className="text-xs text-amber-400 uppercase font-semibold">Ruido</p>
            <p className="text-2xl font-bold mt-1 text-amber-400">{ruido}</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Nodos List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" /> Historial de Investigaciones
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Cargando la red de conocimiento...</div>
            ) : investigaciones.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-900/40 border border-slate-800 rounded-xl">
                No hay registros aún en Supabase.
              </div>
            ) : (
              <div className="space-y-3">
                {investigaciones.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedNode(item)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      selectedNode?.id === item.id
                        ? 'bg-slate-800/80 border-indigo-500/50 shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">#{item.id}</span>
                        <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.tipo}
                        </span>
                        {item.ref_id && (
                          <span className="text-xs font-mono text-indigo-400">↳ Ref: #{item.ref_id}</span>
                        )}
                      </div>
                      {getStatusBadge(item.estado)}
                    </div>
                    <p className="text-sm text-slate-200 font-medium line-clamp-2">{item.contenido}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Autor: <strong className="text-slate-400">{item.autor}</strong></span>
                      <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inspector Panel */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" /> Inspector Epistémico
            </h2>

            {selectedNode ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="font-mono text-sm font-bold">Nodo #{selectedNode.id}</span>
                  {getStatusBadge(selectedNode.estado)}
                </div>

                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Contenido</p>
                  <p className="text-sm text-slate-200 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                    {selectedNode.contenido}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Dictamen Aletheia</p>
                  <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 leading-relaxed">
                    {selectedNode.dictamen_aletheia || 'Pendiente de evaluación por el nodo Aletheia.'}
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-500 border-t border-slate-800 flex justify-between">
                  <span>Evaluado: {selectedNode.evaluado_at ? new Date(selectedNode.evaluado_at).toLocaleDateString() : 'No'}</span>
                  <span>Tipo: {selectedNode.tipo}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-6 text-center text-slate-500 text-sm">
                Selecciona un nodo de la lista para inspeccionar su dictamen completo.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
