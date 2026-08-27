import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Activity, Circle, HelpCircle, FileText, CheckCircle2, XCircle, Search } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    // 1. Cargar nodos iniciales desde la tabla investigaciones
    fetchNodes();

    // 2. Suscribirse a cambios en tiempo real en Supabase
    const subscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investigaciones' }, () => {
        fetchNodes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchNodes = async () => {
    const { data, error } = await supabase
      .from('investigaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNodes(data);
    }
  };

  // Contadores de estado (tolerantes a minúsculas y mayúsculas)
  const metrics = {
    total: nodes.length,
    postulados: nodes.filter((n) => n.estado?.toLowerCase() === 'postulado').length,
    corroborados: nodes.filter((n) => n.estado?.toLowerCase() === 'corroborado').length,
    falsados: nodes.filter((n) => n.estado?.toLowerCase() === 'falsado').length,
    ruido: nodes.filter((n) => n.estado?.toLowerCase() === 'ruido').length,
  };

  const getStatusBadge = (estado) => {
    const est = estado?.toLowerCase();
    switch (est) {
      case 'corroborado':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Corroborado</span>;
      case 'falsado':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3"/> Falsado</span>;
      case 'ruido':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1"><HelpCircle className="w-3 h-3"/> Ruido</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><Circle className="w-3 h-3"/> Postulado</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-7 h-7 text-indigo-500" /> PROYECTO ARKHÉ
            </h1>
            <p className="text-slate-400 text-sm mt-1">Red Epistémica & Dashboard de Nodos en Tiempo Real</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Nodo Aletheia: Online
            </span>
          </div>
        </header>

        {/* Métricas Principales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Nodos</p>
            <p className="text-2xl font-bold text-white mt-1">{metrics.total}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Postulados</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{metrics.postulados}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Corroborados</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{metrics.corroborados}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">Falsados</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{metrics.falsados}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Ruido</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{metrics.ruido}</p>
          </div>
        </div>

        {/* Grafo Interactivo */}
        <KnowledgeGraph nodesData={nodes} />

        {/* Historial / Feed de Nodos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" /> Historial de Investigaciones
          </h2>

          <div className="space-y-3">
            {nodes.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No hay registros aún en el sistema.
              </div>
            ) : (
              nodes.map((node) => (
                <div 
                  key={node.id} 
                  className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-4 rounded-lg transition-all space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">#{node.id}</span>
                      <span className="font-semibold text-sm text-slate-200 capitalize">{node.tipo || 'Investigación'}</span>
                      {node.ref_id && (
                        <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          Ref: #{node.ref_id}
                        </span>
                      )}
                    </div>
                    {getStatusBadge(node.estado)}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {node.contenido || node.texto || node.descripcion}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                    <span>Autor: <strong className="text-slate-400">{node.autor || 'Nodo Aletheia'}</strong></span>
                    <span>{node.created_at ? new Date(node.created_at).toLocaleDateString() : 'Reciente'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
