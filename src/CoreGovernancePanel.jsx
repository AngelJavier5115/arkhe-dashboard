import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, PlayCircle, ShieldCheck, Users } from 'lucide-react';

const INVESTIGATORS = [
  { id: '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f', name: 'Atlas' },
  { id: '122483a9-5012-46ce-a328-5bdb08b4de01', name: 'Aletheia' },
  { id: '656726d1-8209-4240-8169-a7434074609d', name: 'Tekton' },
];

const ROUND_TYPES = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'debate', label: 'Debate' },
  { value: 'replica', label: 'Réplica' },
  { value: 'confrontacion', label: 'Confrontación' },
  { value: 'aclaracion', label: 'Aclaración' },
  { value: 'cierre', label: 'Cierre' },
];

const RECONCILIATION_WAIT_MS = 5 * 60 * 1000;

const CORE_REQUEST_TIMEOUT_MS = 15000;
const READ_ONLY_CORE_ACTIONS = new Set(['consultar_ronda_prueba']);

async function coreAction(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CORE_REQUEST_TIMEOUT_MS);
  let response;
  let body;

  try {
    response = await fetch('/api/arkhe-core', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    body = await response.json().catch(() => ({}));
  } catch {
    const readOnly = READ_ONLY_CORE_ACTIONS.has(payload?.action);
    const timedOut = controller.signal.aborted;
    const error = new Error(timedOut
      ? (readOnly
        ? 'La consulta al Core tardó más de 15 segundos. No se modificó la ronda; vuelve a intentarlo más tarde.'
        : 'La operación superó el límite de espera. Su resultado puede ser ambiguo; no la repitas. Actualiza y revisa el estado guardado primero.')
      : (readOnly
        ? 'No hubo respuesta de red del Core al consultar la ronda.'
        : 'No hubo confirmación de red del Core. No repitas la operación automáticamente.'));
    error.networkAmbiguous = !readOnly;
    error.timedOut = timedOut;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok || body?.ok === false) {
    const error = new Error(body?.error ?? 'Arkhé Core rechazó la operación.');
    error.status = response.status;
    throw error;
  }
  return body;
}

function formatRoundDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function hasRecentWebAuthn(reauthenticatedAt) {
  const timestamp = reauthenticatedAt ? new Date(reauthenticatedAt).getTime() : NaN;
  const elapsed = Date.now() - timestamp;
  return Number.isFinite(timestamp) && elapsed >= 0 && elapsed < 10 * 60 * 1000;
}

function dispatchIdFromMessage(message) {
  const match = String(message ?? '').match(/despacho\s+([0-9a-f]{8}-[0-9a-f-]{27,})/i);
  return match?.[1] ?? null;
}

export default function CoreGovernancePanel({ authenticated, reauthenticatedAt }) {
  const [now, setNow] = useState(Date.now());
  const [investigationCode, setInvestigationCode] = useState('A4-STAGE-001');
  const [question, setQuestion] = useState('');
  const [roundType, setRoundType] = useState('consulta');
  const [nodeId, setNodeId] = useState('');
  const [selected, setSelected] = useState([]);
  const [round, setRound] = useState(null);
  const [invocations, setInvocations] = useState([]);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState(null);
  const [roundCreationUncertain, setRoundCreationUncertain] = useState(false);
  const [preflightReport, setPreflightReport] = useState(null);
  const [roundLookupId, setRoundLookupId] = useState('47aa67e6-8e04-40d8-828c-1e43ce4f44fa');

  const recentReauth = useMemo(
    () => hasRecentWebAuthn(reauthenticatedAt),
    [reauthenticatedAt, now],
  );

  const currentPreflightKey = JSON.stringify({
    investigacion_codigo: investigationCode.trim().toUpperCase(),
    pregunta: question.trim(),
    tipo: roundType,
    participantes: [...selected].sort(),
    nodo_id: nodeId ? String(Number(nodeId)) : null,
  });
  const preflightIsCurrent = Boolean(
    preflightReport && preflightReport.inputKey === currentPreflightKey
  );
  const currentPreflightReady = Boolean(
    preflightIsCurrent && preflightReport.report?.ready_to_create === true
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const updateInvocation = (id, patch) => {
    setInvocations(current => current.map(item =>
      item.id === id ? { ...item, ...patch } : item
    ));
  };

  const requireRecentAuth = () => {
    if (!authenticated || !hasRecentWebAuthn(reauthenticatedAt)) {
      setStatus({
        kind: 'warning',
        message: 'Esta acción requiere una sesión humana activa y una reautenticación WebAuthn de menos de diez minutos. Reautentica y vuelve a revisar el estado antes de decidir el siguiente paso.',
      });
      return false;
    }
    return true;
  };

  const runRoundPreflight = async () => {
    if (!requireRecentAuth()) return;
    if (round || roundCreationUncertain || busy !== '') {
      setStatus({
        kind: 'warning',
        message: 'Antes de revisar una nueva ronda, resuelve el estado del formulario actual. El preflight no recupera ni modifica una ronda previa.',
      });
      return;
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || trimmedQuestion.length > 4000) {
      setStatus({ kind: 'error', message: 'Escribe una pregunta de entre 1 y 4000 caracteres.' });
      return;
    }
    if (selected.length === 0) {
      setStatus({ kind: 'error', message: 'Selecciona al menos un investigador.' });
      return;
    }
    if (nodeId && (!Number.isSafeInteger(Number(nodeId)) || Number(nodeId) <= 0)) {
      setStatus({ kind: 'error', message: 'El ID del nodo debe ser un entero positivo.' });
      return;
    }

    const inputKey = currentPreflightKey;
    setBusy('preflight');
    setStatus(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CORE_REQUEST_TIMEOUT_MS);
      let response;
      let body;
      try {
        response = await fetch('/api/arkhe-round-preflight', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            investigacion_codigo: investigationCode.trim(),
            pregunta: trimmedQuestion,
            tipo: roundType,
            participantes: selected,
            ...(nodeId ? { nodo_id: Number(nodeId) } : {}),
          }),
          signal: controller.signal,
        });
        body = await response.json().catch(() => ({}));
      } catch {
        throw new Error(controller.signal.aborted
          ? 'El preflight superó 15 segundos. No se creó ni modificó ninguna ronda; revisa la conexión antes de volver a consultarlo.'
          : 'No hubo confirmación de red del preflight. No se creó ni modificó ninguna ronda; puedes consultar de nuevo el estado.');
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok || body?.ok !== true || !body?.preflight) {
        const error = new Error(body?.error ?? 'Arkhé no devolvió un informe válido de preflight.');
        error.status = response.status;
        throw error;
      }

      setPreflightReport({ inputKey, report: body.preflight });
      const hasWarnings = (body.preflight.checks ?? []).some(check => check.status === 'warning');
      setStatus({
        kind: body.preflight.ready_to_create ? (hasWarnings ? 'warning' : 'success') : 'warning',
        message: body.preflight.ready_to_create
          ? (hasWarnings
            ? 'Preflight completado con advertencias. Revisa las rondas activas y los estados antes de decidir humanamente si continúas.'
            : 'Preflight completado. La revisión es de sólo lectura y todavía no crea ninguna ronda ni convocatoria.')
          : 'Preflight bloqueado. Corrige los puntos marcados antes de volver a revisarlo.',
      });
    } catch (error) {
      setPreflightReport(null);
      setStatus({
        kind: 'error',
        message: error?.message ?? 'No fue posible revisar la ronda.',
      });
    } finally {
      setBusy('');
    }
  };

  const createRoundAndInvocations = async event => {
    event.preventDefault();
    if (!requireRecentAuth()) return;
    if (round || roundCreationUncertain) {
      setStatus({
        kind: 'warning',
        message: 'Ya se intentó crear una ronda en este formulario. No la crees de nuevo a ciegas: primero inspecciona el Core y confirma si existen la ronda y sus convocatorias.',
      });
      return;
    }
    if (!currentPreflightReady) {
      setStatus({
        kind: 'warning',
        message: 'Antes de crear, ejecuta un preflight válido para los datos actuales y revisa todas las advertencias. Cualquier cambio en la pregunta, tipo, participantes o nodo invalida el informe anterior.',
      });
      return;
    }
    if (!question.trim() || question.trim().length > 4000) {
      setStatus({ kind: 'error', message: 'Escribe una pregunta de entre 1 y 4000 caracteres.' });
      return;
    }
    if (!investigationCode.trim()) {
      setStatus({ kind: 'error', message: 'El código de investigación es obligatorio.' });
      return;
    }
    if (selected.length === 0) {
      setStatus({ kind: 'error', message: 'Selecciona al menos un investigador.' });
      return;
    }
    if (nodeId && (!Number.isSafeInteger(Number(nodeId)) || Number(nodeId) <= 0)) {
      setStatus({ kind: 'error', message: 'El ID del nodo debe ser un entero positivo.' });
      return;
    }

    setBusy('create');
    setStatus(null);
    try {
      const startPayload = {
        action: 'iniciar_ronda',
        investigacion_codigo: investigationCode.trim(),
        tipo: roundType,
        pregunta: question.trim(),
        participantes: selected,
        contexto: { origen: 'dashboard', interfaz: 'core-governance-panel-v1' },
      };
      if (nodeId) startPayload.nodo_id = Number(nodeId);

      const started = await coreAction(startPayload);
      if (!started?.ronda?.id) {
        setRoundCreationUncertain(true);
        throw new Error('El Core no devolvió el ID de ronda. Antes de repetir, inspecciona el estado del Core.');
      }

      setRound(started.ronda);
      // If the second request has an ambiguous result, never replay the first
      // request: that would create another round.
      try {
        const created = await coreAction({
          action: 'convocar_investigadores',
          ronda_id: started.ronda.id,
          investigadores: selected,
          tipo_convocatoria: 'perspectiva',
          instruccion_humana: question.trim(),
        });
        const list = Array.isArray(created.convocatorias) ? created.convocatorias : [];
        setInvocations(list.map(item => ({
          ...item,
          investigatorName: INVESTIGATORS.find(person => person.id === item.investigador_id)?.name ?? 'Investigador desconocido',
          dispatchState: 'idle',
          dispatchId: null,
          dispatchMessage: null,
          dispatchAt: null,
          reconcileNote: '',
          confirmRuntimeChecked: false,
          reconciliationUnknown: false,
        })));
        setStatus({
          kind: 'success',
          message: 'Ronda creada y convocatorias registradas. No se ha enviado ningún despacho todavía. Revisa cada convocatoria y despáchala manualmente sólo después de confirmar la reautenticación reciente.',
        });
      } catch (error) {
        setRoundCreationUncertain(true);
        setStatus({
          kind: 'warning',
          message: 'La ronda ' + started.ronda.id + ' se creó, pero no se pudo confirmar la creación de sus convocatorias. No se envió ningún despacho. Inspecciona el Core antes de intentar completar el flujo; no pulses “Crear ronda” otra vez. Detalle: ' + (error?.message ?? 'error desconocido'),
        });
      }
    } catch (error) {
      const uncertain = Boolean(error?.networkAmbiguous || (Number(error?.status) >= 500));
      if (uncertain) setRoundCreationUncertain(true);
      setStatus({
        kind: uncertain ? 'warning' : 'error',
        message: uncertain
          ? 'No se pudo confirmar si Arkhé Core alcanzó a crear la ronda. No la vuelvas a crear automáticamente; inspecciona el Core antes de continuar. Detalle: ' + (error?.message ?? 'error desconocido')
          : (error?.message ?? 'No fue posible crear la ronda.'),
      });
    } finally {
      setBusy('');
    }
  };

  const loadExistingStagingRound = async () => {
    if (!requireRecentAuth()) return;
    if (round || roundCreationUncertain || busy !== '') {
      setStatus({
        kind: 'warning',
        message: 'Antes de recuperar otra ronda, resuelve el estado del formulario actual. No se creó ni despachó nada automáticamente.',
      });
      return;
    }
    const rondaId = String(roundLookupId ?? '').trim();
    if (!rondaId) {
      setStatus({ kind: 'error', message: 'Introduce el ID de la ronda sintética que quieres recuperar.' });
      return;
    }

    setBusy('load');
    setStatus(null);
    try {
      const loaded = await coreAction({
        action: 'consultar_ronda_prueba',
        ronda_id: rondaId,
      });
      const items = Array.isArray(loaded.convocatorias) ? loaded.convocatorias : [];
      setRound(loaded.ronda);
      setInvocations(items.map(item => {
        const previous = item.latest_dispatch ?? null;
        const previousStatus = previous?.status ?? null;
        let dispatchState = 'idle';
        let dispatchMessage = null;
        if (previous) {
          if (previousStatus === 'revoked') {
            dispatchState = 'revoked';
            dispatchMessage = 'El registro de Core confirma que el despacho anterior fue revocado manualmente. No se reintentó durante la recuperación.';
          } else if (previousStatus === 'expired' && previous.reconciliation_note) {
            dispatchState = 'expired';
            dispatchMessage = 'El despacho anterior vencido y nunca reclamado quedó resuelto con nota de auditoría. No se creó una intervención.';
          } else if (['issued', 'claimed', 'expired'].includes(previousStatus)) {
            dispatchState = 'ambiguous';
            dispatchMessage = 'Core conserva un despacho previo en estado "' + previousStatus + '". No se autoriza un reintento automático; revisa logs y reconcilia el registro antes de continuar.';
          } else {
            dispatchState = 'ambiguous';
            dispatchMessage = 'Existe un registro de despacho previo que requiere revisión humana antes de continuar.';
          }
        }
        return {
          ...item,
          investigatorName: item.investigador_nombre ?? INVESTIGATORS.find(person => person.id === item.investigador_id)?.name ?? 'Investigador desconocido',
          dispatchState,
          dispatchId: previous?.dispatch_id ?? null,
          dispatchMessage,
          dispatchAt: previous ? Date.parse(previous.claimed_at ?? previous.issued_at) : null,
          reconcileNote: '',
          confirmRuntimeChecked: false,
          reconciliationUnknown: false,
        };
      }));
      setStatus({
        kind: 'success',
        message: 'Ronda sintética recuperada desde Supabase junto con el estado persistido de cada despacho. La recuperación no creó ni envió nada.',
      });
    } catch (error) {
      setStatus({
        kind: error?.networkAmbiguous ? 'warning' : 'error',
        message: error?.message ?? 'No fue posible recuperar la ronda sintética.',
      });
    } finally {
      setBusy('');
    }
  };

  const dispatchInvocation = async invocation => {
    if (!requireRecentAuth()) return;
    if (['sending', 'accepted', 'ambiguous', 'reconciling', 'reconciliation-unknown'].includes(invocation.dispatchState)) {
      setStatus({
        kind: 'warning',
        message: 'Esta convocatoria ya tiene un intento de despacho. No lo repitas automáticamente; inspecciona el estado anterior primero.',
      });
      return;
    }

    setBusy('dispatch:' + invocation.id);
    updateInvocation(invocation.id, { dispatchState: 'sending', dispatchMessage: null });
    setStatus(null);
    try {
      const result = await coreAction({
        action: 'despachar_convocatoria',
        convocatoria_id: invocation.id,
      });
      updateInvocation(invocation.id, {
        dispatchState: 'accepted',
        dispatchId: result.dispatch_id,
        dispatchAt: Date.now(),
        dispatchMessage: 'El cuerpo confirmó HTTP 202 y el Core confirmó el despacho de un solo uso.',
        reconciliationUnknown: false,
      });
      setStatus({
        kind: 'success',
        message: invocation.investigatorName + ': despacho aceptado por su servicio. El Core no volverá a enviarlo automáticamente.',
      });
    } catch (error) {
      const id = dispatchIdFromMessage(error?.message);
      updateInvocation(invocation.id, {
        dispatchState: id ? 'ambiguous' : 'failed-before-issue',
        dispatchId: id,
        dispatchAt: Date.now(),
        dispatchMessage: error?.message ?? 'No hubo confirmación del Core.',
        reconciliationUnknown: Boolean(error?.networkAmbiguous),
        confirmRuntimeChecked: false,
        reconcileNote: '',
      });
      setStatus({
        kind: error?.networkAmbiguous || id ? 'warning' : 'error',
        message: id
          ? 'El estado del despacho ' + id + ' es ambiguo. No lo vuelvas a despachar automáticamente. Revisa los logs/runtime y la existencia de una intervención antes de considerar la reconciliación.'
          : 'No se confirmó que el despacho llegara a emitirse. Revisa el mensaje antes de decidir el siguiente paso. Detalle: ' + (error?.message ?? 'error desconocido'),
      });
    } finally {
      setBusy('');
    }
  };

  const reconcileDispatch = async invocation => {
    if (!requireRecentAuth()) return;
    if (!invocation.dispatchId || !['accepted', 'ambiguous'].includes(invocation.dispatchState)) {
      setStatus({ kind: 'warning', message: 'No hay un despacho identificado y elegible para reconciliación.' });
      return;
    }
    if (invocation.dispatchAt && Date.now() - invocation.dispatchAt < RECONCILIATION_WAIT_MS) {
      setStatus({ kind: 'warning', message: 'Espera al menos cinco minutos desde el último resultado de despacho y revisa el runtime antes de reconciliar.' });
      return;
    }
    if (!invocation.confirmRuntimeChecked) {
      setStatus({ kind: 'warning', message: 'Confirma que revisaste el runtime/logs y que no existe una intervención persistida ni una ejecución activa que deba conservarse.' });
      return;
    }
    const note = String(invocation.reconcileNote ?? '').trim();
    if (note.length < 10 || note.length > 500) {
      setStatus({ kind: 'error', message: 'La nota de reconciliación debe tener entre 10 y 500 caracteres.' });
      return;
    }

    setBusy('reconcile:' + invocation.id);
    updateInvocation(invocation.id, { dispatchState: 'reconciling' });
    setStatus(null);
    try {
      const result = await coreAction({
        action: 'reconciliar_despacho_convocatoria',
        convocatoria_id: invocation.id,
        dispatch_id: invocation.dispatchId,
        reconciliation_note: note,
      });
      const resolvedStatus = result?.dispatch?.status;
      const resolved = ['revoked', 'expired'].includes(resolvedStatus);
      updateInvocation(invocation.id, {
        dispatchState: resolvedStatus === 'revoked' ? 'revoked' : resolvedStatus === 'expired' ? 'expired' : 'reconciliation-unknown',
        dispatchMessage: resolvedStatus === 'revoked'
          ? 'El despacho reclamado fue revocado con autorización humana. No se reintentó ni creó una intervención.'
          : resolvedStatus === 'expired'
            ? 'El despacho vencido no fue reclamado. Core lo marcó como expirado y guardó la nota de auditoría; no se creó una intervención.'
            : 'Core no confirmó una resolución del despacho; inspecciona el estado antes de continuar.',
        reconciliationUnknown: !resolved,
        confirmRuntimeChecked: false,
      });
      setStatus({
        kind: resolved ? 'success' : 'warning',
        message: resolvedStatus === 'revoked'
          ? 'Despacho reclamado revocado por autorización humana. Puedes evaluar un nuevo despacho como acción separada después de revisar la convocatoria.'
          : resolvedStatus === 'expired'
            ? 'Despacho vencido y no reclamado resuelto. Puedes evaluar un nuevo despacho como acción humana separada después de despertar Atlas Preview.'
            : 'No hay confirmación suficiente de la reconciliación. No repitas la operación automáticamente.',
      });
    } catch (error) {
      const unknown = Boolean(error?.networkAmbiguous);
      updateInvocation(invocation.id, {
        dispatchState: unknown ? 'reconciliation-unknown' : invocation.dispatchState,
        reconciliationUnknown: unknown,
        dispatchMessage: unknown
          ? 'Resultado ambiguo de reconciliación. No repitas automáticamente; inspecciona el registro y la convocatoria.'
          : error?.message ?? 'No fue posible reconciliar el despacho.',
        confirmRuntimeChecked: false,
      });
      setStatus({
        kind: 'warning',
        message: unknown
          ? 'La reconciliación no devolvió confirmación de red. No vuelvas a ejecutar la acción sin inspeccionar primero el registro.'
          : (error?.message ?? 'El Core rechazó la reconciliación. Revisa el estado antes de decidir otro paso.'),
      });
    } finally {
      setBusy('');
    }
  };


  if (!authenticated) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-indigo-400" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Arkhé Core · Gobierno de rondas</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            La creación y el despacho requieren reautenticación WebAuthn reciente. El navegador sólo llama a la API del Core; no escribe directamente en las tablas semánticas ni puede declarar a Ángel como actor.
          </p>
        </div>
      </div>

      <div className={
        "rounded-lg border p-3 text-xs " +
        (recentReauth
          ? "border-emerald-900/70 bg-emerald-950/20 text-emerald-200"
          : "border-amber-900/70 bg-amber-950/20 text-amber-200")
      }>
        {recentReauth
          ? 'Reautenticación WebAuthn reciente. El servidor volverá a verificarla en cada acción.'
          : 'Reautenticación WebAuthn pendiente o caducada. Usa “Reautenticar” arriba antes de iniciar, despachar o reconciliar.'}
      </div>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
        <div className="text-xs font-semibold text-slate-200">Recuperar ronda sintética existente</div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Recupera una ronda guardada en Supabase después de recargar la página. Esta consulta es de sólo lectura y está limitada al proyecto de prueba A4-STAGE-001.
        </p>
        <label className="block text-xs text-slate-300">
          ID de ronda
          <input
            value={roundLookupId}
            onChange={event => setRoundLookupId(event.target.value)}
            disabled={busy !== '' || Boolean(round) || roundCreationUncertain}
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60"
          />
        </label>
        <button
          type="button"
          onClick={loadExistingStagingRound}
          disabled={!recentReauth || busy !== '' || Boolean(round) || roundCreationUncertain}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 hover:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy === 'load' ? 'Consultando en el Core…' : 'Recuperar ronda registrada'}
        </button>
      </div>

      <form onSubmit={createRoundAndInvocations} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-300">
            Código de investigación
            <input
              value={investigationCode}
              onChange={event => setInvestigationCode(event.target.value)}
              disabled={Boolean(round) || roundCreationUncertain || busy !== ''}
              maxLength={80}
              required
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Tipo de ronda
            <select
              value={roundType}
              onChange={event => setRoundType(event.target.value)}
              disabled={Boolean(round) || roundCreationUncertain || busy !== ''}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60"
            >
              {ROUND_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>

        <label className="block text-xs text-slate-300">
          Pregunta de la ronda
          <textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            disabled={Boolean(round) || roundCreationUncertain || busy !== ''}
            minLength={1}
            maxLength={4000}
            required
            rows={3}
            placeholder="¿Qué queremos investigar y qué evidencia necesitamos contrastar?"
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60"
          />
        </label>

        <label className="block text-xs text-slate-300">
          Nodo ancla (opcional)
          <input
            inputMode="numeric"
            value={nodeId}
            onChange={event => setNodeId(event.target.value)}
            disabled={Boolean(round) || roundCreationUncertain || busy !== ''}
            placeholder="ID del nodo"
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60"
          />
        </label>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Users className="h-4 w-4 text-indigo-400" />
            Investigadores convocados
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {INVESTIGATORS.map(investigator => (
              <label key={investigator.id} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={selected.includes(investigator.id)}
                  onChange={event => setSelected(current =>
                    event.target.checked
                      ? [...current, investigator.id]
                      : current.filter(id => id !== investigator.id)
                  )}
                  disabled={Boolean(round) || roundCreationUncertain || busy !== ''}
                  className="mt-0.5 accent-indigo-500"
                />
                <span>{investigator.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={runRoundPreflight}
          disabled={!recentReauth || busy !== '' || Boolean(round) || roundCreationUncertain}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-800 bg-cyan-950/30 px-4 py-2.5 text-xs font-semibold text-cyan-100 hover:border-cyan-600 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <CheckCircle2 className="h-4 w-4" />
          {busy === 'preflight' ? 'Revisando investigación…' : 'Revisar antes de crear'}
        </button>

        {preflightReport && (
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            {!preflightIsCurrent ? (
              <div role="status" className="rounded-md border border-amber-900/70 bg-amber-950/20 p-3 text-xs text-amber-200">
                El informe anterior ya no corresponde a los datos actuales. Vuelve a ejecutar el preflight; no se permite crear con un informe obsoleto.
              </div>
            ) : (
              <>
                <div className={
                  "rounded-md border p-3 text-xs " +
                  (preflightReport.report.ready_to_create
                    ? "border-emerald-900/70 bg-emerald-950/20 text-emerald-200"
                    : "border-rose-900/70 bg-rose-950/20 text-rose-200")
                }>
                  <div className="font-semibold">
                    {preflightReport.report.ready_to_create
                      ? 'Preflight completado · revisión humana pendiente'
                      : 'Preflight bloqueado'}
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Investigación sintética: {preflightReport.report.investigation?.code}. La información se consultó sin crear rondas, convocatorias, despachos, intervenciones ni relaciones semánticas.
                  </p>
                </div>

                <div className="space-y-2">
                  {(preflightReport.report.checks ?? []).map(check => (
                    <div key={check.key} className="flex items-start gap-2 text-xs">
                      {check.status === 'passed'
                        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        : check.status === 'warning'
                          ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                          : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
                      <div className="min-w-0">
                        <div className="font-medium text-slate-200">{check.label}</div>
                        <div className="mt-0.5 leading-relaxed text-slate-400">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {(preflightReport.report.active_rounds ?? []).length > 0 && (
                  <div className="rounded-md border border-amber-900/60 bg-amber-950/10 p-3">
                    <div className="text-xs font-semibold text-amber-200">Rondas ya abiertas o pausadas</div>
                    <ul className="mt-2 space-y-1">
                      {preflightReport.report.active_rounds.map(activeRound => (
                        <li key={activeRound.id} className="text-xs text-slate-300">
                          Ronda #{activeRound.numero} · {activeRound.tipo} · {activeRound.estado} · {formatRoundDate(activeRound.created_at)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[11px] leading-relaxed text-slate-500">
                  El preflight es una ayuda de revisión, no una autorización ni un bloqueo de seguridad del servidor. La creación sigue necesitando la sesión WebAuthn reciente; no se envían convocatorias ni se despachan investigadores automáticamente.
                </p>
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!recentReauth || busy !== '' || Boolean(round) || roundCreationUncertain || !currentPreflightReady}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <PlayCircle className="h-4 w-4" />
          {busy === 'create' ? 'Creando en el Core…' : 'Crear ronda y convocatorias'}
        </button>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Se crearán la ronda y las convocatorias, pero no se enviará ningún despacho automáticamente. Si la confirmación es ambigua, el formulario quedará bloqueado para evitar duplicar rondas.
        </p>
      </form>

      {round && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-200">Ronda registrada</div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-400">{round.id}</div>
            </div>
            <span className="rounded-full border border-emerald-900 px-2 py-1 text-[11px] text-emerald-200">#{round.numero ?? '—'}</span>
          </div>
          <p className="text-xs text-slate-300">{round.pregunta}</p>
          {invocations.length === 0 && (
            <p className="text-xs text-amber-200">
              No se confirmaron convocatorias. Inspecciona el Core antes de intentar recuperar este flujo; no vuelvas a crear la ronda desde este formulario.
            </p>
          )}
        </div>
      )}

      {invocations.map(invocation => {
        const dispatchBusy = busy === 'dispatch:' + invocation.id;
        const reconcileBusy = busy === 'reconcile:' + invocation.id;
        const hasDispatch = Boolean(invocation.dispatchId);
        const waitElapsed = !invocation.dispatchAt || now - invocation.dispatchAt >= RECONCILIATION_WAIT_MS;
        const canReconcile = hasDispatch &&
          ['accepted', 'ambiguous'].includes(invocation.dispatchState) &&
          waitElapsed &&
          invocation.confirmRuntimeChecked &&
          String(invocation.reconcileNote ?? '').trim().length >= 10 &&
          String(invocation.reconcileNote ?? '').trim().length <= 500 &&
          !invocation.reconciliationUnknown;
        const canDispatch = ['idle', 'revoked', 'expired', 'failed-before-issue'].includes(invocation.dispatchState);

        return (
          <div key={invocation.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-slate-200">{invocation.investigatorName}</h4>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{invocation.id}</p>
              </div>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300">{invocation.estado ?? 'enviada'}</span>
            </div>

            {invocation.dispatchMessage && (
              <div className={
                "rounded-md border p-2 text-xs " +
                (invocation.dispatchState === 'accepted' || invocation.dispatchState === 'revoked' || invocation.dispatchState === 'expired'
                  ? "border-emerald-900/70 bg-emerald-950/20 text-emerald-200"
                  : "border-amber-900/70 bg-amber-950/20 text-amber-200")
              }>
                {invocation.dispatchMessage}
                {invocation.dispatchId && (
                  <div className="mt-1 break-all font-mono text-[11px]">Dispatch: {invocation.dispatchId}</div>
                )}
              </div>
            )}

            {canDispatch && (
              <button
                type="button"
                onClick={() => dispatchInvocation(invocation)}
                disabled={!recentReauth || busy !== '' || invocation.dispatchState === 'failed-before-issue'}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-700 bg-indigo-950/50 px-3 py-2 text-xs font-medium text-indigo-100 hover:border-indigo-500 disabled:opacity-45"
              >
                <PlayCircle className="h-4 w-4" />
                {dispatchBusy ? 'Despachando…' : ['revoked', 'expired'].includes(invocation.dispatchState) ? 'Autorizar un nuevo despacho' : 'Despachar convocatoria'}
              </button>
            )}

            {hasDispatch && ['accepted', 'ambiguous'].includes(invocation.dispatchState) && (
              <div className="space-y-2 rounded-lg border border-slate-800 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  Reconciliación manual de un despacho
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Sólo después de revisar logs/runtime y el estado de la convocatoria. Si el despacho venció sin ser reclamado, Core lo marcará como expirado; si fue reclamado, sólo podrá revocarse tras cinco minutos y sin intervenciones. Nunca se resuelve una ejecución que aún deba conservarse.
                </p>
                <label className="flex items-start gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={invocation.confirmRuntimeChecked}
                    onChange={event => updateInvocation(invocation.id, { confirmRuntimeChecked: event.target.checked })}
                    disabled={busy !== '' || !waitElapsed || invocation.reconciliationUnknown}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <span>Confirmo que revisé el runtime/logs, que no existe una intervención persistida y que no hay una ejecución activa que deba conservarse.</span>
                </label>
                <label className="block text-xs text-slate-300">
                  Nota de auditoría (10–500 caracteres)
                  <textarea
                    value={invocation.reconcileNote}
                    onChange={event => updateInvocation(invocation.id, { reconcileNote: event.target.value })}
                    disabled={busy !== '' || !waitElapsed || invocation.reconciliationUnknown}
                    rows={2}
                    maxLength={500}
                    placeholder="Qué se comprobó y por qué corresponde marcarlo expirado o revocarlo."
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </label>
                {!waitElapsed && invocation.dispatchAt && (
                  <p className="text-[11px] text-amber-200">
                    Espera {Math.ceil((RECONCILIATION_WAIT_MS - (now - invocation.dispatchAt)) / 1000)} segundos más antes de poder reconciliar.
                  </p>
                )}
                {invocation.reconciliationUnknown && (
                  <p className="text-xs text-amber-200">
                    Resultado ambiguo de reconciliación. No vuelvas a enviarla sin inspeccionar primero el registro del despacho y el estado de la convocatoria.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => reconcileDispatch(invocation)}
                  disabled={!recentReauth || busy !== '' || !canReconcile}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-100 hover:border-amber-600 disabled:opacity-40"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {reconcileBusy ? 'Reconciliando…' : 'Revisar y resolver despacho anterior'}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {status && (
        <div role="status" className={
          "rounded-lg border p-3 text-xs leading-relaxed " +
          (status.kind === 'success'
            ? "border-emerald-900/70 bg-emerald-950/20 text-emerald-200"
            : status.kind === 'error'
              ? "border-rose-900/70 bg-rose-950/20 text-rose-200"
              : "border-amber-900/70 bg-amber-950/20 text-amber-200")
        }>
          {status.message}
        </div>
      )}

      <div className="border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-500">
        La migración de despacho continúa en revisión y aún no está aplicada a Supabase compartido. Este panel es una interfaz de Preview, no una señal de que los bots o las llaves estén desplegados. No se configura ni se muestra material secreto aquí.
      </div>
    </section>
  );
}
