import { createClient } from '@supabase/supabase-js';
import { authenticateServiceRequest, expectedInvestigatorForService, MAX_CLOCK_SKEW_MS } from './service-auth.js';

const ANGEL_ID = '2a003935-f248-442c-96fc-dcee29c4d41a';
const INVESTIGATOR_IDS = {
  angel: ANGEL_ID,
  atlas: '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  aletheia: '122483a9-5012-46ce-a328-5bdb08b4de01',
  tekton: '656726d1-8209-4240-8169-a7434074609d'
};

const allowedRoundTypes = new Set([
  'consulta',
  'debate',
  'replica',
  'confrontacion',
  'aclaracion',
  'cierre'
]);

const allowedInvocationTypes = new Set([
  'perspectiva',
  'debate',
  'replica',
  'aclaracion'
]);

const SERVICE_INVESTIGATOR_ACTIONS = new Set([
  'obtener_convocatoria',
  'completar_convocatoria',
  'fallar_convocatoria'
]);

function json(res, status, body) {
  res.status(status).json(body);
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_KEY;
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_KEY.');
  return createClient(url, key);
}

function requireCoreToken(req) {
  const expected = process.env.ARKHE_CORE_TOKEN;
  const provided = req.headers['x-arkhe-core-token'];
  if (!expected) throw new Error('ARKHE_CORE_TOKEN no está configurado.');
  if (!provided || provided !== expected) {
    const error = new Error('No autorizado.');
    error.status = 401;
    throw error;
  }
}

function requireAngel(actorId) {
  if (actorId !== ANGEL_ID) {
    const error = new Error('Solo Ángel puede gobernar una ronda.');
    error.status = 403;
    throw error;
  }
}

function uuid(value, field) {
  if (!value || typeof value !== 'string') {
    throw new Error(field + ' es obligatorio.');
  }
  return value;
}

function ids(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('participantes debe ser un arreglo con al menos un investigador.');
  }
  return [...new Set(value.map(String))];
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

async function authenticateInvestigatorRequest(req, body, supabase) {
  req.__arkheSignedBody = body;

  const identity = authenticateServiceRequest(req);
  const expectedInvestigatorId = expectedInvestigatorForService(identity.serviceId);

  if (!identity.verified || !expectedInvestigatorId) {
    const error = new Error('Firma de servicio inválida.');
    error.status = 401;
    throw error;
  }

  if (identity.investigadorId !== expectedInvestigatorId) {
    const error = new Error('La identidad del servicio no está vinculada al investigador esperado.');
    error.status = 403;
    throw error;
  }

  const expiresAt = new Date(
    Number(identity.timestamp) + MAX_CLOCK_SKEW_MS
  ).toISOString();

  const { error } = await supabase
    .from('core_request_nonces')
    .insert({
      nonce: identity.nonce,
      service_id: identity.serviceId,
      request_timestamp: identity.timestamp,
      expires_at: expiresAt
    });

  if (error) {
    if (error.code === '23505') {
      const replay = new Error('Nonce ya utilizado.');
      replay.status = 401;
      throw replay;
    }
    throw error;
  }

  return identity;
}

function requireBoundInvestigator(serviceIdentity) {
  if (!serviceIdentity?.investigadorId) {
    const error = new Error('Identidad de servicio requerida.');
    error.status = 401;
    throw error;
  }

  return serviceIdentity.investigadorId;
}

async function assertParticipants(supabase, investigacionId, participantIds) {
  const { data, error } = await supabase
    .from('participaciones')
    .select('investigador_id, estado')
    .eq('investigacion_id', investigacionId)
    .in('investigador_id', participantIds);

  if (error) throw error;

  const active = new Set(
    (data ?? [])
      .filter(row => row.estado === 'activo')
      .map(row => row.investigador_id)
  );

  const missing = participantIds.filter(id => !active.has(id));
  if (missing.length) {
    throw new Error(
      'Investigadores no activos en la investigación: ' + missing.join(', ')
    );
  }
}

async function loadRoundContext(supabase, rondaId) {
  const { data: ronda, error: rondaError } = await supabase
    .from('rondas_investigacion')
    .select('*')
    .eq('id', rondaId)
    .single();

  if (rondaError) throw rondaError;
  if (!ronda) throw new Error('Ronda no encontrada.');

  const { data: investigacion, error: investigacionError } = await supabase
    .from('investigaciones_proyecto')
    .select('id, codigo, titulo, objetivo, pregunta, descripcion, estado')
    .eq('id', ronda.investigacion_id)
    .single();

  if (investigacionError) throw investigacionError;

  const { data: intervenciones, error: intervencionesError } = await supabase
    .from('intervenciones_ronda')
    .select('id, ronda_id, investigador_id, orden, tipo, contenido, responde_a_intervencion_id, nodo_id, metadata, created_at')
    .eq('ronda_id', ronda.id)
    .order('orden', { ascending: true });

  if (intervencionesError) throw intervencionesError;

  let foco = null;
  if (ronda.foco_intervencion_id) {
    const { data, error } = await supabase
      .from('intervenciones_ronda')
      .select('id, ronda_id, investigador_id, orden, tipo, contenido, responde_a_intervencion_id, nodo_id, metadata, created_at')
      .eq('id', ronda.foco_intervencion_id)
      .single();

    if (error) throw error;
    foco = data;
  }

  return {
    ronda,
    investigacion,
    foco_intervencion: foco,
    intervenciones: intervenciones ?? []
  };
}

async function actionStartRound(supabase, body) {
  requireAngel(body.actor_id);

  const participantIds = ids(body.participantes);

  if (!allowedRoundTypes.has(body.tipo ?? 'consulta')) {
    throw new Error('Tipo de ronda inválido.');
  }

  let investigacionQuery = supabase
    .from('investigaciones_proyecto')
    .select('id, codigo, titulo, objetivo, pregunta, descripcion, estado');

  if (body.investigacion_id) {
    investigacionQuery = investigacionQuery.eq('id', body.investigacion_id);
  } else if (body.investigacion_codigo) {
    investigacionQuery = investigacionQuery.eq('codigo', body.investigacion_codigo);
  } else {
    throw new Error('investigacion_id o investigacion_codigo es obligatorio.');
  }

  const { data: investigacion, error: invError } = await investigacionQuery.single();

  if (invError) throw invError;
  if (!investigacion) throw new Error('Investigación no encontrada.');

  const investigacionId = investigacion.id;

  await assertParticipants(supabase, investigacionId, participantIds);

  const { data: numeroData, error: numeroError } = await supabase
    .rpc('arkhe_siguiente_numero_ronda', { p_investigacion_id: investigacionId });

  if (numeroError) throw numeroError;

  let nodoContexto = null;
  if (body.nodo_id != null) {
    const { data: nodo, error: nodoError } = await supabase
      .from('investigaciones')
      .select('id, ref_id, autor, contenido, tipo, metadata, estado, created_at')
      .eq('id', body.nodo_id)
      .single();
    if (nodoError) throw nodoError;
    if (!nodo) throw new Error(`Nodo ${body.nodo_id} no encontrado.`);

    const { data: link, error: linkError } = await supabase
      .from('investigacion_nodos')
      .select('investigacion_id')
      .eq('investigacion_id', investigacionId)
      .eq('nodo_id', body.nodo_id)
      .maybeSingle();
    if (linkError) throw linkError;
    if (!link) throw new Error(`El nodo #${body.nodo_id} no pertenece a la investigación ${investigacion.codigo}.`);

    nodoContexto = nodo;
  }

  const contexto = {
    ...(body.contexto ?? {}),
    ...(nodoContexto ? { nodo: nodoContexto } : {}),
    gobernanza: {
      controlador: ANGEL_ID,
      participantes_iniciales: participantIds
    }
  };

  const { data: ronda, error: rondaError } = await supabase
    .from('rondas_investigacion')
    .insert({
      investigacion_id: investigacionId,
      numero: Number(numeroData),
      tipo: body.tipo ?? 'consulta',
      estado: 'abierta',
      pregunta: body.pregunta ?? investigacion.pregunta ?? '',
      iniciada_por: ANGEL_ID,
      destinatario_id: participantIds.length === 1 ? participantIds[0] : null,
      ronda_padre_id: body.ronda_padre_id ?? null,
      fase_id: body.fase_id ?? null,
      foco_intervencion_id: body.foco_intervencion_id ?? null,
      contexto
    })
    .select('*')
    .single();

  if (rondaError) throw rondaError;

  return { ronda, investigacion, participantes: participantIds };
}

async function actionCreateInvocations(supabase, body) {
  requireAngel(body.actor_id);

  const rondaId = uuid(body.ronda_id, 'ronda_id');
  const participantIds = ids(body.investigadores);
  const tipo = body.tipo_convocatoria ?? 'perspectiva';

  if (!allowedInvocationTypes.has(tipo)) {
    throw new Error('Tipo de convocatoria inválido.');
  }

  const context = await loadRoundContext(supabase, rondaId);
  if (!['abierta', 'pausada'].includes(context.ronda.estado)) {
    throw new Error('La ronda no acepta nuevas convocatorias en su estado actual.');
  }

  await assertParticipants(supabase, context.ronda.investigacion_id, participantIds);

  const invocations = participantIds.map(investigadorId => ({
    ronda_id: rondaId,
    convocada_por: ANGEL_ID,
    investigador_id: investigadorId,
    tipo_convocatoria: tipo,
    foco_intervencion_id: body.foco_intervencion_id ?? context.ronda.foco_intervencion_id ?? null,
    instruccion_humana: body.instruccion_humana ?? null,
    estado: 'enviada',
    correlation_id: crypto.randomUUID()
  }));

  const { data, error } = await supabase
    .from('convocatorias_ronda')
    .insert(invocations)
    .select('*');

  if (error) throw error;

  return {
    ronda: context.ronda,
    investigacion: context.investigacion,
    foco_intervencion: context.foco_intervencion,
    intervenciones: context.intervenciones,
    convocatorias: data ?? []
  };
}

async function actionGetInvocation(supabase, body, serviceIdentity) {
  const investigadorId = requireBoundInvestigator(serviceIdentity);
  const convocatoriaId = uuid(body.convocatoria_id, 'convocatoria_id');

  const { data: convocatoria, error } = await supabase
    .from('convocatorias_ronda')
    .select('*')
    .eq('id', convocatoriaId)
    .single();

  if (error) throw error;
  if (!convocatoria) throw new Error('Convocatoria no encontrada.');
  if (convocatoria.investigador_id !== investigadorId) {
    const forbidden = new Error('La convocatoria no pertenece al investigador autenticado.');
    forbidden.status = 403;
    throw forbidden;
  }
  if (convocatoria.estado !== 'enviada' && convocatoria.estado !== 'pendiente') {
    throw new Error('La convocatoria ya no está disponible para ejecución.');
  }

  const context = await loadRoundContext(supabase, convocatoria.ronda_id);

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles_investigadores')
    .select('investigador_id, nombre_identitario, proposito, especialidad, principios, prompt_base, version')
    .eq('investigador_id', convocatoria.investigador_id)
    .eq('activo', true)
    .single();

  if (perfilError) throw perfilError;

  const { data: memorias, error: memoriasError } = await supabase
    .from('memorias_investigador')
    .select('id, tipo, contenido, fuente, importancia, metadata, created_at')
    .eq('investigador_id', convocatoria.investigador_id)
    .eq('estado', 'activa')
    .order('importancia', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (memoriasError) throw memoriasError;

  return {
    convocatoria,
    identidad: perfil,
    memoria_identitaria: memorias ?? [],
    ronda: context.ronda,
    investigacion: context.investigacion,
    foco_intervencion: context.foco_intervencion,
    intervenciones: context.intervenciones
  };
}

async function actionCompleteInvocation(supabase, body, serviceIdentity) {
  const investigadorId = requireBoundInvestigator(serviceIdentity);
  const rondaId = uuid(body.ronda_id, 'ronda_id');
  const convocatoriaId = uuid(body.convocatoria_id, 'convocatoria_id');

  if (body.investigador_id && body.investigador_id !== investigadorId) {
    const forbidden = new Error('El investigador declarado no coincide con la identidad del servicio.');
    forbidden.status = 403;
    throw forbidden;
  }

  const { data: convocatoria, error: convocatoriaError } = await supabase
    .from('convocatorias_ronda')
    .select('*')
    .eq('id', convocatoriaId)
    .single();

  if (convocatoriaError) throw convocatoriaError;
  if (!convocatoria) throw new Error('Convocatoria no encontrada.');
  if (convocatoria.investigador_id !== investigadorId || convocatoria.ronda_id !== rondaId) {
    throw new Error('La respuesta no coincide con la convocatoria.');
  }
  if (!['enviada', 'pendiente'].includes(convocatoria.estado)) {
    throw new Error('La convocatoria ya fue completada o cancelada.');
  }

  const metadata = {
    ...(body.metadata ?? {}),
    convocatoria_id: convocatoriaId,
    identidad_version: body.identidad_version ?? null,
    modelo: body.modelo ?? null,
    proveedor: body.proveedor ?? null,
    servicio_autenticado: serviceIdentity.serviceId
  };

  const { data: intervencion, error: intervencionError } = await supabase.rpc(
    'arkhe_insert_intervencion_ronda',
    {
      p_ronda_id: rondaId,
      p_investigador_id: investigadorId,
      p_tipo: body.tipo ?? 'perspectiva',
      p_contenido: body.contenido,
      p_responde_a_intervencion_id:
        body.responde_a_intervencion_id ?? convocatoria.foco_intervencion_id ?? null,
      p_nodo_id: body.nodo_id ?? null,
      p_metadata: metadata
    }
  );

  if (intervencionError) throw intervencionError;

  const { data: updatedConvocatoria, error: updateError } = await supabase
    .from('convocatorias_ronda')
    .update({
      estado: 'completada',
      completed_at: new Date().toISOString()
    })
    .eq('id', convocatoriaId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  return { intervencion, convocatoria: updatedConvocatoria };
}



async function actionFailInvocation(supabase, body, serviceIdentity) {
  const investigadorId = requireBoundInvestigator(serviceIdentity);
  const convocatoriaId = uuid(body.convocatoria_id, 'convocatoria_id');

  if (body.investigador_id && body.investigador_id !== investigadorId) {
    const forbidden = new Error('El investigador declarado no coincide con la identidad del servicio.');
    forbidden.status = 403;
    throw forbidden;
  }

  const { data: convocatoria, error: convocatoriaError } = await supabase
    .from('convocatorias_ronda')
    .select('*')
    .eq('id', convocatoriaId)
    .single();

  if (convocatoriaError) throw convocatoriaError;
  if (!convocatoria) throw new Error('Convocatoria no encontrada.');
  if (convocatoria.investigador_id !== investigadorId) {
    const forbidden = new Error('El investigador no coincide con la identidad del servicio.');
    forbidden.status = 403;
    throw forbidden;
  }

  if (!['enviada', 'pendiente'].includes(convocatoria.estado)) {
    return { convocatoria };
  }

  const { data, error } = await supabase
    .from('convocatorias_ronda')
    .update({
      estado: 'error',
      completed_at: new Date().toISOString()
    })
    .eq('id', convocatoriaId)
    .select('*')
    .single();

  if (error) throw error;

  return { convocatoria: data };
}

async function actionOpenDebate(supabase, body) {
  requireAngel(body.actor_id);

  const focusId = uuid(body.foco_intervencion_id, 'foco_intervencion_id');
  const participants = ids(body.investigadores);

  const { data: focoBase, error: focoBaseError } = await supabase
    .from('intervenciones_ronda')
    .select('id, ronda_id, investigador_id, tipo, contenido, nodo_id, created_at')
    .eq('id', focusId)
    .single();

  if (focoBaseError) throw focoBaseError;
  if (!focoBase) throw new Error('La intervención foco no existe.');

  const parentRoundId = body.ronda_padre_id ?? focoBase.ronda_id;
  const parentContext = await loadRoundContext(supabase, parentRoundId);

  if (!['abierta', 'pausada', 'cerrada'].includes(parentContext.ronda.estado)) {
    throw new Error('La ronda padre no puede originar este debate.');
  }

  if (!parentContext.intervenciones.some(item => item.id === focusId)) {
    const { data: focus, error: focusError } = await supabase
      .from('intervenciones_ronda')
      .select('id, ronda_id, investigador_id')
      .eq('id', focusId)
      .single();

    if (focusError) throw focusError;
    if (!focus || focus.ronda_id !== parentRoundId) {
      throw new Error('La intervención foco no pertenece a la ronda padre.');
    }
  }

  const created = await actionStartRound(supabase, {
    actor_id: ANGEL_ID,
    investigacion_id: parentContext.ronda.investigacion_id,
    tipo: 'debate',
    pregunta: body.pregunta ?? body.instruccion_humana ?? parentContext.ronda.pregunta,
    participantes,
    ronda_padre_id: parentRoundId,
    foco_intervencion_id: focusId,
    contexto: {
      debate: true,
      foco_intervencion_id: focusId,
      ronda_padre_id: parentRoundId
    }
  });

  const convocated = await actionCreateInvocations(supabase, {
    actor_id: ANGEL_ID,
    ronda_id: created.ronda.id,
    investigadores: participants,
    tipo_convocatoria: 'debate',
    foco_intervencion_id: focusId,
    instruccion_humana: body.instruccion_humana ?? null
  });

  return {
    ...created,
    convocatorias: convocated.convocatorias,
    foco_intervencion: parentContext.intervenciones.find(item => item.id === focusId) ?? null
  };
}

async function actionRoundState(supabase, body, state) {
  requireAngel(body.actor_id);

  const roundId = uuid(body.ronda_id, 'ronda_id');
  const patch = { estado: state };

  if (state === 'cerrada' || state === 'cancelada') {
    patch.closed_at = new Date().toISOString();
  }

  if (state === 'cerrada') {
    patch.conclusion = body.conclusion ?? null;
    patch.decision = body.decision ?? null;
  }

  const { data, error } = await supabase
    .from('rondas_investigacion')
    .update(patch)
    .eq('id', roundId)
    .select('*')
    .single();

  if (error) throw error;
  return { ronda: data };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      requireCoreToken(req);
      return json(res, 200, {
        ok: true,
        core: 'arkhe-rounds',
        version: '0.3',
        status: 'active'
      });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Método no permitido.' });
    }

    const body = await readBody(req);
    const supabase = getSupabase();
    const serviceIdentity = SERVICE_INVESTIGATOR_ACTIONS.has(body.action)
      ? await authenticateInvestigatorRequest(req, body, supabase)
      : null;

    if (!serviceIdentity) {
      requireCoreToken(req);
    }

    let result;
    switch (body.action) {
      case 'iniciar_ronda':
        result = await actionStartRound(supabase, body);
        break;
      case 'convocar_investigadores':
        result = await actionCreateInvocations(supabase, body);
        break;
      case 'obtener_convocatoria':
        result = await actionGetInvocation(supabase, body, serviceIdentity);
        break;
      case 'completar_convocatoria':
        result = await actionCompleteInvocation(supabase, body, serviceIdentity);
        break;
      case 'fallar_convocatoria':
        result = await actionFailInvocation(supabase, body, serviceIdentity);
        break;
      case 'abrir_debate':
        result = await actionOpenDebate(supabase, body);
        break;
      case 'pausar_ronda':
        result = await actionRoundState(supabase, body, 'pausada');
        break;
      case 'cerrar_ronda':
        result = await actionRoundState(supabase, body, 'cerrada');
        break;
      case 'cancelar_ronda':
        result = await actionRoundState(supabase, body, 'cancelada');
        break;
      default:
        throw new Error('Acción Core desconocida.');
    }

    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error('[Arkhe Core]', error);
    return json(res, error?.status ?? 500, {
      ok: false,
      error: error?.message ?? 'Error interno del Core.'
    });
  }
}


export { actionCompleteInvocation };
