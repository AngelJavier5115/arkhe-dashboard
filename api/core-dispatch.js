import {
  createHash,
  createPrivateKey,
  randomUUID,
  sign
} from 'node:crypto';

const TARGETS = Object.freeze({
  atlas: {
    env: 'ARKHE_ATLAS_INVOCATION_URL',
    host: 'atlas-bot-8in0.onrender.com'
  },
  aletheia: {
    env: 'ARKHE_ALETHEIA_INVOCATION_URL',
    host: 'aletheia-bot-u6r3.onrender.com'
  },
  tekton: {
    env: 'ARKHE_TEKTON_INVOCATION_URL',
    host: 'tekton-bot.onrender.com'
  }
});

function normalizePem(value) {
  return String(value ?? '').replace(/\\n/g, '\n').trim();
}

function configError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

export function buildCoreDispatchPayload({
  serviceId,
  timestamp,
  dispatchId,
  serializedBody
}) {
  const bodyHash = createHash('sha256')
    .update(serializedBody, 'utf8')
    .digest('hex');

  return [
    'arkhe-core-dispatch-v1',
    serviceId,
    String(timestamp),
    dispatchId,
    bodyHash
  ].join('.');
}

export function signCoreDispatchRequest({
  serviceId,
  body,
  privateKeyPem = process.env.ARKHE_CORE_DISPATCH_PRIVATE_KEY,
  timestamp = Date.now(),
  dispatchId = randomUUID()
}) {
  if (!Object.hasOwn(TARGETS, serviceId)) {
    throw new Error('Destino de despacho Core desconocido.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('El cuerpo de despacho debe ser un objeto JSON.');
  }
  if (!privateKeyPem) {
    throw new Error('ARKHE_CORE_DISPATCH_PRIVATE_KEY no está configurado.');
  }
  if (!Number.isSafeInteger(Number(timestamp))) {
    throw new Error('Timestamp de despacho no válido.');
  }
  if (typeof dispatchId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dispatchId)) {
    throw new Error('dispatch_id debe ser un UUID v4.');
  }
  if (body.dispatch_id !== dispatchId) {
    throw new Error('dispatch_id debe coincidir con el identificador firmado.');
  }

  let privateKey;
  try {
    privateKey = createPrivateKey(normalizePem(privateKeyPem));
  } catch {
    throw new Error('ARKHE_CORE_DISPATCH_PRIVATE_KEY no contiene una llave privada PEM válida.');
  }
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('ARKHE_CORE_DISPATCH_PRIVATE_KEY debe ser Ed25519.');
  }

  const serializedBody = JSON.stringify(body);
  const payload = buildCoreDispatchPayload({
    serviceId,
    timestamp,
    dispatchId,
    serializedBody
  });
  const signature = sign(null, Buffer.from(payload, 'utf8'), privateKey)
    .toString('base64url');

  return {
    serializedBody,
    headers: {
      'Content-Type': 'application/json',
      'x-arkhe-dispatch-target': serviceId,
      'x-arkhe-dispatch-timestamp': String(timestamp),
      'x-arkhe-dispatch-id': dispatchId,
      'x-arkhe-dispatch-signature': signature
    }
  };
}

function targetUrl(serviceId) {
  const target = TARGETS[serviceId];
  if (!target) throw new Error('Destino de despacho Core desconocido.');

  const configured = process.env[target.env];
  if (!configured) {
    throw configError(target.env + ' no está configurado.');
  }

  let url;
  try {
    url = new URL(configured);
  } catch {
    throw configError(target.env + ' no contiene una URL válida.');
  }

  const vercelEnv = process.env.VERCEL_ENV;
  const hostIsRender = url.hostname.endsWith('.onrender.com');
  const isProductionHost = url.hostname === target.host;
  let environmentTargetAllowed = false;

  if (vercelEnv === 'preview') {
    // A Preview deployment must never send a signed request to the live bot.
    environmentTargetAllowed = hostIsRender &&
      !isProductionHost &&
      /(?:preview|staging|test)/i.test(url.hostname);
  } else if (vercelEnv === 'production') {
    environmentTargetAllowed = isProductionHost &&
      process.env.ARKHE_CORE_DISPATCH_ENABLED === 'true';
  }

  if (
    url.protocol !== 'https:' ||
    !environmentTargetAllowed ||
    url.pathname !== '/arkhe/invocation' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw configError(
      target.env + ' no coincide con el entorno de despliegue autorizado. ' +
      'Preview requiere un servicio Render de prueba; producción requiere ' +
      'ARKHE_CORE_DISPATCH_ENABLED=true.'
    );
  }

  return url.toString();
}

export function assertCoreDispatchConfigured(serviceIds) {
  const privateKeyPem = process.env.ARKHE_CORE_DISPATCH_PRIVATE_KEY;
  if (!privateKeyPem) {
    throw configError('ARKHE_CORE_DISPATCH_PRIVATE_KEY no está configurado para despachar convocatorias.');
  }

  let privateKey;
  try {
    privateKey = createPrivateKey(normalizePem(privateKeyPem));
  } catch {
    throw configError('ARKHE_CORE_DISPATCH_PRIVATE_KEY no es una llave privada válida.');
  }
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw configError('ARKHE_CORE_DISPATCH_PRIVATE_KEY debe ser Ed25519.');
  }

  const unique = [...new Set(serviceIds)];
  if (!unique.length) throw configError('No hay investigadores seleccionados para despacho.');
  if (!['preview', 'production'].includes(process.env.VERCEL_ENV)) {
    throw configError('El despacho sólo se permite desde un entorno Vercel Preview o Production definido.');
  }
  for (const serviceId of unique) targetUrl(serviceId);
}

export async function dispatchInvocation({
  serviceId,
  convocatoriaId,
  discordChannelId = null,
  timeoutMs = 7000
}) {
  const url = targetUrl(serviceId);
  const dispatchId = randomUUID();
  const body = {
    dispatch_id: dispatchId,
    convocatoria_id: convocatoriaId,
    ...(discordChannelId ? { discord_channel_id: discordChannelId } : {})
  };
  const signed = signCoreDispatchRequest({ serviceId, body });

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: signed.headers,
      body: signed.serializedBody,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    const safe = new Error(
      'No se confirmó la recepción del despacho para ' + serviceId +
      '. No reintentes automáticamente; reconcilia la convocatoria primero.'
    );
    safe.code = 'DISPATCH_RESULT_AMBIGUOUS';
    safe.cause = error;
    throw safe;
  }

  const result = await response.json().catch(() => null);
  if (
    response.status !== 202 ||
    result?.ok !== true ||
    result?.accepted !== true ||
    result?.dispatch_id !== dispatchId
  ) {
    const failure = new Error(
      'El cuerpo ' + serviceId + ' no confirmó el despacho firmado (HTTP ' + response.status + ').'
    );
    failure.status = response.status >= 400 ? response.status : 502;
    throw failure;
  }

  return {
    accepted: true,
    service_id: serviceId,
    dispatch_id: dispatchId,
    convocatoria_id: convocatoriaId,
    status: response.status
  };
}

export { TARGETS };
