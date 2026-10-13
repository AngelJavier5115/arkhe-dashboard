export const ALLOWED_ROUND_TYPES = Object.freeze([
  'consulta',
  'debate',
  'replica',
  'confrontacion',
  'aclaracion',
  'cierre',
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROUND_TYPE_SET = new Set(ALLOWED_ROUND_TYPES);

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

export function normalizeInvestigationPreflightInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid('El cuerpo de preflight debe ser un objeto JSON.');
  }

  const investigationId = body.investigacion_id == null ? '' : String(body.investigacion_id).trim();
  const investigationCode = body.investigacion_codigo == null ? '' : String(body.investigacion_codigo).trim();

  if (investigationId && !UUID_PATTERN.test(investigationId)) {
    throw invalid('investigacion_id debe ser un UUID válido.');
  }
  if (!investigationId && !investigationCode) {
    throw invalid('investigacion_id o investigacion_codigo es obligatorio.');
  }
  if (investigationCode.length > 80) {
    throw invalid('investigacion_codigo no puede superar 80 caracteres.');
  }

  const question = typeof body.pregunta === 'string' ? body.pregunta.trim() : '';
  if (!question || question.length > 4000) {
    throw invalid('La pregunta debe contener entre 1 y 4000 caracteres.');
  }

  const type = body.tipo ?? 'consulta';
  if (typeof type !== 'string' || !ROUND_TYPE_SET.has(type)) {
    throw invalid('Tipo de ronda inválido.');
  }

  if (!Array.isArray(body.participantes) || body.participantes.length === 0 || body.participantes.length > 10) {
    throw invalid('participantes debe ser un arreglo con entre 1 y 10 investigadores.');
  }
  const participantIds = [];
  for (const value of body.participantes) {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      throw invalid('Cada participante debe tener un UUID válido.');
    }
    if (!participantIds.includes(value)) participantIds.push(value);
  }

  let nodeId = null;
  if (body.nodo_id !== undefined && body.nodo_id !== null && body.nodo_id !== '') {
    const numericNodeId = Number(body.nodo_id);
    if (!Number.isSafeInteger(numericNodeId) || numericNodeId <= 0) {
      throw invalid('nodo_id debe ser un entero positivo.');
    }
    nodeId = numericNodeId;
  }

  return {
    investigacion_id: investigationId || null,
    investigacion_codigo: investigationCode || null,
    pregunta: question,
    tipo: type,
    participantes: participantIds,
    nodo_id: nodeId,
  };
}

export function buildInvestigationPreflightReport({
  input,
  investigation,
  participationRows = [],
  investigatorRows = [],
  profileRows = [],
  openRounds = [],
  node = null,
  nodeLinked = false,
}) {
  const activeParticipationIds = new Set(
    participationRows
      .filter(row => row.estado === 'activo')
      .map(row => row.investigador_id)
  );
  const investigatorById = new Map(investigatorRows.map(row => [row.id, row]));
  const profileById = new Map(profileRows.map(row => [row.investigador_id, row]));

  const plannedInvestigators = input.participantes.map(id => {
    const investigator = investigatorById.get(id);
    const profile = profileById.get(id);
    const participationActive = activeParticipationIds.has(id);
    const profileActive = Boolean(profile?.activo === true);
    return {
      id,
      nombre: investigator?.nombre ?? profile?.nombre_identitario ?? 'Investigador desconocido',
      participacion_activa: participationActive,
      perfil_activo: profileActive,
      especialidad: profile?.especialidad ?? null,
      version_perfil: profile?.version ?? null,
      ready: participationActive && profileActive,
    };
  });

  const investigationActive = investigation?.estado === 'activa';
  const allParticipantsReady = plannedInvestigators.length > 0 && plannedInvestigators.every(item => item.ready);
  const anchorStatus = input.nodo_id === null
    ? 'skipped'
    : node && nodeLinked
      ? 'pass'
      : 'blocked';

  const checks = [
    {
      id: 'investigation_active',
      status: investigationActive ? 'pass' : 'blocked',
      message: investigationActive
        ? 'La investigación existe y está activa.'
        : 'La investigación no está en estado activa; no se recomienda iniciar una ronda.',
    },
    {
      id: 'participants_active',
      status: plannedInvestigators.every(item => item.participacion_activa) ? 'pass' : 'blocked',
      message: plannedInvestigators.every(item => item.participacion_activa)
        ? 'Todos los investigadores elegidos tienen participación activa en esta investigación.'
        : 'Uno o más investigadores seleccionados no tienen participación activa en esta investigación.',
    },
    {
      id: 'investigator_profiles',
      status: plannedInvestigators.every(item => item.perfil_activo) ? 'pass' : 'blocked',
      message: plannedInvestigators.every(item => item.perfil_activo)
        ? 'Todos los investigadores elegidos tienen un perfil identitario activo.'
        : 'Uno o más investigadores seleccionados no tienen un perfil identitario activo.',
    },
    {
      id: 'anchor_node',
      status: anchorStatus,
      message: input.nodo_id === null
        ? 'No se solicitó un nodo ancla.'
        : anchorStatus === 'pass'
          ? 'El nodo ancla existe y pertenece a la investigación.'
          : !node
            ? 'El nodo ancla no existe.'
            : 'El nodo ancla no pertenece a esta investigación.',
    },
    {
      id: 'existing_open_rounds',
      status: openRounds.length ? 'warning' : 'pass',
      message: openRounds.length
        ? 'Hay rondas abiertas o pausadas de esta investigación; revísalas antes de decidir iniciar otra.'
        : 'No se encontraron rondas abiertas o pausadas para esta investigación.',
    },
  ];

  const blocked = checks.some(check => check.status === 'blocked') || !allParticipantsReady;
  const hasWarnings = checks.some(check => check.status === 'warning');
  const status = blocked ? 'blocked' : hasWarnings ? 'warning' : 'ready';

  return {
    action: 'preflight_investigacion',
    read_only: true,
    status,
    ready_to_start: !blocked,
    requires_human_confirmation: true,
    effects: {
      rounds_created: 0,
      invitations_created: 0,
      dispatches_sent: 0,
    },
    plan: {
      investigacion_id: investigation.id,
      investigacion_codigo: investigation.codigo,
      tipo: input.tipo,
      pregunta: input.pregunta,
      participantes: input.participantes,
      nodo_id: input.nodo_id,
    },
    investigation: {
      id: investigation.id,
      codigo: investigation.codigo,
      titulo: investigation.titulo ?? null,
      objetivo: investigation.objetivo ?? null,
      estado: investigation.estado ?? null,
    },
    investigators: plannedInvestigators,
    anchor_node: input.nodo_id === null
      ? null
      : {
          id: input.nodo_id,
          found: Boolean(node),
          belongs_to_investigation: Boolean(node && nodeLinked),
          ref_id: node?.ref_id ?? null,
          tipo: node?.tipo ?? null,
        },
    open_rounds: openRounds.map(round => ({
      id: round.id,
      numero: round.numero,
      tipo: round.tipo,
      estado: round.estado,
      pregunta: round.pregunta,
      created_at: round.created_at,
    })),
    checks,
    note: 'Este informe es una fotografía de solo lectura. El Core volverá a validar las reglas al recibir una orden humana posterior; este preflight no reserva estado ni autoriza convocatorias.',
  };
}
