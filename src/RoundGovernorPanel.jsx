import { useEffect, useMemo, useState } from 'react';
import { CirclePlay, ShieldCheck, ShieldAlert, LoaderCircle } from 'lucide-react';

const INVESTIGATORS = [
  { id: '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f', name: 'Atlas', detail: 'Perspectiva independiente' },
  { id: '122483a9-5012-46ce-a328-5bdb08b4de01', name: 'Aletheia', detail: 'Contraste y falsación' },
  { id: '656726d1-8209-4240-8169-a7434074609d', name: 'Tekton', detail: 'Arquitectura y viabilidad' },
];

async function corePost(payload) {
  const response = await fetch('/api/arkhe-core', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok === false) {
    const error = new Error(result?.error || 'Arkhé Core rechazó la operación.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export default function RoundGovernorPanel() {
  const [question, setQuestion] = useState('');
  const [investigationCode, setInvestigationCode] = useState('AR-001');
  const [selected, setSelected] = useState(INVESTIGATORS.map(item => item.id));
  const [nodeId, setNodeId] = useState('');
  const [discordChannelId, setDiscordChannelId] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [sessionAuthenticated, setSessionAuthenticated] = useState(false);

  const selectedNames = useMemo(
    () => INVESTIGATORS.filter(item => selected.includes(item.id)).map(item => item.name),
    [selected]
  );

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(response => response.json())
      .then(session => {
        if (active) setSessionAuthenticated(Boolean(session?.authenticated));
      })
      .catch(() => {
        if (active) setSessionAuthenticated(false);
      });
    return () => { active = false; };
  }, []);

  const toggleInvestigator = id => {
    setSelected(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id]
    );
  };

  const runRound = async event => {
    event.preventDefault();
    setStatus('');
    setResult(null);

    const cleanQuestion = question.trim();
    const cleanCode = investigationCode.trim();
    const cleanNodeId = nodeId.trim();
    const cleanChannelId = discordChannelId.trim();

    if (!cleanQuestion) {
      setStatus('Escribe la pregunta de la ronda.');
      return;
    }
    if (!cleanCode) {
      setStatus('Indica el código de investigación.');
      return;
    }
    if (!selected.length) {
      setStatus('Selecciona al menos un investigador.');
      return;
    }
    if (cleanNodeId && (!/^\d+$/.test(cleanNodeId) || Number(cleanNodeId) <= 0)) {
      setStatus('El nodo ancla debe ser un entero positivo.');
      return;
    }
    if (cleanChannelId && !/^\d{17,20}$/.test(cleanChannelId)) {
      setStatus('El ID de canal de Discord debe contener entre 17 y 20 dígitos.');
      return;
    }

    setBusy(true);
    try {
      // This read-only gate must pass before any round row is created.
      await corePost({
        action: 'preflight_despacho',
        investigadores: selected,
      });

      const roundResult = await corePost({
        action: 'iniciar_ronda',
        investigacion_codigo: cleanCode,
        tipo: 'consulta',
        pregunta: cleanQuestion,
        participantes: selected,
        nodo_id: cleanNodeId ? Number(cleanNodeId) : null,
        contexto: {
          origen: 'dashboard',
          adaptador: 'web-human-governor-v1',
        },
      });

      const convocatoriaResult = await corePost({
        action: 'convocar_investigadores',
        ronda_id: roundResult.ronda.id,
        investigadores: selected,
        tipo_convocatoria: 'perspectiva',
        instruccion_humana: cleanQuestion,
        despachar: true,
        ...(cleanChannelId ? { discord_channel_id: cleanChannelId } : {}),
      });

      setResult({
        ronda: roundResult.ronda,
        convocatoriaResult,
      });

      const summary = convocatoriaResult.dispatch_summary;
      if (summary && summary.failed_or_ambiguous > 0) {
        setStatus(
          'La ronda y las convocatorias se crearon, pero uno o más despachos no se confirmaron. ' +
          'No vuelvas a ejecutar la acción automáticamente; revisa el estado de cada convocatoria.'
        );
      } else {
        setStatus('Ronda creada. Arkhé Core confirmó la aceptación de los despachos indicados.');
      }
    } catch (error) {
      setStatus(
        error?.status === 401
          ? 'La sesión humana necesita una passkey autenticada y una reautenticación reciente. Ve al panel Gobierno humano y pulsa “Reautenticar”; después verifica primero el estado de la ronda antes de repetir.'
          : (error?.message || 'No se pudo completar la operación.')
      );
    } finally {
      setBusy(false);
      fetch('/api/auth/session', { credentials: 'same-origin' })
        .then(response => response.json())
        .then(session => setSessionAuthenticated(Boolean(session?.authenticated)))
        .catch(() => setSessionAuthenticated(false));
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Gobierno de rondas
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            La creación requiere la sesión humana WebAuthn de Ángel. El Core comprobará primero
            la configuración firmada y aislada del entorno antes de crear una ronda.
          </p>
        </div>
        <span className={
          'rounded-full border px-3 py-1.5 text-xs ' +
          (sessionAuthenticated
            ? 'border-emerald-800 bg-emerald-950/50 text-emerald-300'
            : 'border-amber-800 bg-amber-950/50 text-amber-300')
        }>
          {sessionAuthenticated ? 'Sesión presente' : 'Autentica una passkey'}
        </span>
      </div>

      {!sessionAuthenticated && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-900/70 bg-amber-950/30 p-3 text-xs text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Autentica o reautentica la passkey en el panel “Gobierno humano” antes de enviar la solicitud.</p>
        </div>
      )}

      <form onSubmit={runRound} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-slate-400">
            <span>Código de investigación</span>
            <input
              value={investigationCode}
              onChange={event => setInvestigationCode(event.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              autoComplete="off"
              required
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            <span>Nodo ancla (opcional)</span>
            <input
              inputMode="numeric"
              value={nodeId}
              onChange={event => setNodeId(event.target.value)}
              placeholder="Ej. 5"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            />
          </label>
        </div>

        <label className="block space-y-1 text-xs text-slate-400">
          <span>Pregunta de la ronda</span>
          <textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="¿Qué queremos investigar y qué resultado nos permitiría avanzar?"
            className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none focus:border-indigo-500"
            required
          />
        </label>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Investigadores convocados</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {INVESTIGATORS.map(investigator => (
              <label key={investigator.id} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <input
                  type="checkbox"
                  checked={selected.includes(investigator.id)}
                  onChange={() => toggleInvestigator(investigator.id)}
                  className="mt-0.5 accent-indigo-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-200">{investigator.name}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">{investigator.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="block space-y-1 text-xs text-slate-400">
          <span>Canal de Discord para publicar resultados (opcional)</span>
          <input
            value={discordChannelId}
            onChange={event => setDiscordChannelId(event.target.value)}
            inputMode="numeric"
            placeholder="ID del canal; no el nombre ni el enlace"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
          <span className="block text-[11px] text-slate-500">No introduzcas tokens de bots ni secretos. Sin canal, el cuerpo procesa la convocatoria sin publicar en Discord.</span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Selección: {selectedNames.join(', ') || 'ningún investigador'}.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CirclePlay className="h-4 w-4" />}
            {busy ? 'Verificando y convocando…' : 'Verificar y abrir ronda'}
          </button>
        </div>
      </form>

      {status && (
        <div role="status" className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-300">
          {status}
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-xs font-semibold text-slate-200">
            Ronda #{result.ronda?.numero ?? '—'} · {result.ronda?.estado ?? 'creada'}
          </div>
          <div className="text-xs text-slate-400 break-all">ID: {result.ronda?.id}</div>
          <div className="space-y-1 pt-2">
            {(result.convocatoriaResult?.dispatch ?? []).map(item => (
              <div key={item.convocatoria_id || item.dispatch_id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 py-2 text-xs">
                <span className="text-slate-300">{item.service_id || 'Investigador'}</span>
                <span className={item.accepted ? 'text-emerald-300' : 'text-amber-300'}>
                  {item.accepted ? 'Despacho aceptado (HTTP 202)' : 'No confirmado; requiere reconciliación'}
                </span>
                <span className="w-full break-all text-[10px] text-slate-500">
                  Convocatoria: {item.convocatoria_id}
                  {item.dispatch_id ? ' · Despacho: ' + item.dispatch_id : ''}
                </span>
              </div>
            ))}
          </div>
          {!result.convocatoriaResult?.dispatch?.length && (
            <p className="text-xs text-amber-300">No hay confirmaciones de despacho disponibles. Verifica las convocatorias en Arkhé Core.</p>
          )}
        </div>
      )}
    </section>
  );
}
