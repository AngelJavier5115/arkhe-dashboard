import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Activity, ShieldCheck, AlertTriangle, HelpCircle, FileText, CheckCircle2, XCircle, Search } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    // 1. Cargar nodos iniciales
    fetchNodes();

    // 2. Suscribirse a cambios en tiempo real en Supabase
    const subscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nodos' }, (payload) => {
        fetchNodes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchNodes = async () => {
    const { data, error } = await supabase
      .from('nodos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNodes(data);
    }
  };

  // Contadores de estado
  const metrics = {
    total: nodes.length,
    postulados: nodes.filter((n) => n.estado === 'Postulado').length,
    corroborados: nodes.filter((n) => n.estado === 'Corroborado').length,
    falsados: nodes.filter((n) => n.estado === 'Falsado').length,
    ruido: nodes.filter((n) => n.estado === 'Ruido').length,
  };

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'Corroborado':
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Corroborado</span>;
      case 'Falsado':
        return <span className="px-2 py-0.5 rounded text-xs bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Falsado</span>;
      case 'Ruido':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Ruido</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-950 text-blue-400 border border-blue-800 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Postulado</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950 border border-indigo-800 rounded-lg text-indigo-400">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">PROYECTO ARKHÉ</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Red Epistémica & Dashboard de Nodos en Tiempo Real</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-300 w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Nodo Aletheia: Online
        </div>
      </header>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Nodos</p>
          <p className="text-2xl font-black text-white mt-1">{metrics.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-400 uppercase">Postulados</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{metrics.postulados}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-400 uppercase">Corroborados</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.corroborados}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-rose-400 uppercase">Falsados</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{metrics.falsados}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-amber-400 uppercase">Ruido</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{metrics.ruido}</p>
        </div>
      </div>

      {/* Grafo Interactivo de Conocimiento (Fase 1) */}
      <div className="mb-6">
        <KnowledgeGraph nodesData={nodes} />
      </div>

      {/* Main Grid: Feed & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historial Feed */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-indigo-400" /> Historial de Investigaciones
          </h2>
          {nodes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
              Esperando postulados desde Discord...
            </div>
          ) : (
            nodes.map((nodo) => (
              <div
                key={nodo.id}
                onClick={() => setSelectedNode(nodo)}
                className={`bg-slate-900 border rounded-xl p-4 transition-all cursor-pointer hover:border-slate-700 ${
                  selectedNode?.id === nodo.id ? 'border-indigo-500 bg-slate-850' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">#{nodo.id}</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-800 rounded text-slate-300 uppercase">
                      {nodo.tipo || 'NODO'}
                    </span>
                    {nodo.ref_id && (
                      <span className="text-xs text-indigo-400 font-mono">↳ Ref: #{nodo.ref_id}</span>
                    )}
                  </div>
                  {getStatusBadge(nodo.estado)}
                </div>
                <p className="text-sm text-slate-200 line-clamp-2">{nodo.contenido}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Autor: <strong className="text-slate-400">{nodo.autor || 'orgánico'}</strong></span>
                  <span>{nodo.created_at ? new Date(nodo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Inspector Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-fit sticky top-4">
          <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> Inspector Epistémico
          </h2>
          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">ID & Estado</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-300">Nodo #{selectedNode.id}</span>
                  {getStatusBadge(selectedNode.estado)}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Contenido de la Premisa</span>
                <p className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 leading-relaxed">
                  {selectedNode.contenido}
                </p>
              </div>
              {selectedNode.dictamen && (
                <div>
                  <span className="text-slate-500 block mb-1">Dictamen del Nodo Aletheia</span>
                  <p className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 leading-relaxed font-mono">
                    {selectedNode.dictamen}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Selecciona un nodo de la lista para inspeccionar su dictamen completo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
