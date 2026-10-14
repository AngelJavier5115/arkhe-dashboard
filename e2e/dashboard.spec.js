import { test, expect } from '@playwright/test';

const ATLAS_ID = '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f';
const ROUND_ID = 'd27f66c7-9e6f-4e69-9059-cd6b45a4e001';

function syntheticPreflight() {
  const checks = [
    {
      key: 'project_active',
      label: 'Investigación',
      status: 'passed',
      detail: 'A4-STAGE-001 existe y está activa en el entorno sintético.',
    },
    {
      key: 'participation_atlas',
      label: 'Participación · Atlas',
      status: 'passed',
      detail: 'La participación está activa en A4-STAGE-001.',
    },
    {
      key: 'availability_atlas',
      label: 'Estado · Atlas',
      status: 'passed',
      detail: 'El investigador figura como disponible.',
    },
    {
      key: 'active_rounds',
      label: 'Rondas abiertas o pausadas',
      status: 'warning',
      detail: 'Ya hay 1 ronda(s) abierta(s) o pausada(s). Revísalas para evitar duplicar trabajo; el preflight no toma esa decisión por ti.',
    },
    {
      key: 'anchor_node',
      label: 'Nodo ancla',
      status: 'passed',
      detail: 'No se seleccionó un nodo ancla.',
    },
  ];

  return {
    ok: true,
    preflight: {
      version: 'arkhe-round-preflight-v0.1',
      mode: 'read-only',
      read_only: true,
      ready_to_create: true,
      investigation: {
        code: 'A4-STAGE-001',
        title: 'Investigación sintética A.4',
        state: 'activa',
      },
      request: {
        round_type: 'consulta',
        question_length: 48,
        participant_ids: [ATLAS_ID],
        node_id: null,
      },
      investigators: [{
        id: ATLAS_ID,
        name: 'Atlas',
        state: 'disponible',
        participation_state: 'activo',
      }],
      anchor_node: null,
      checks,
      warnings: checks.filter(check => check.status === 'warning'),
      active_rounds: [{
        id: ROUND_ID,
        numero: 1,
        tipo: 'consulta',
        estado: 'abierta',
        created_at: '2026-10-11T19:18:00.000Z',
      }],
      side_effects: {
        rounds_created: 0,
        convocations_created: 0,
        dispatches_sent: 0,
        interventions_written: 0,
        semantic_writes: 0,
      },
    },
  };
}

async function installSyntheticNetwork(page, {
  authenticated = false,
  preflightStatus = 200,
} = {}) {
  const counters = {
    preflightRequests: [],
    coreActions: [],
  };

  await page.route('**/rest/v1/**', async route => {
    const method = route.request().method();
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        },
        body: '',
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
      },
      contentType: 'application/json',
      body: '[]',
    });
  });

  // The dashboard opens a Realtime socket; keep browser tests fully offline.
  await page.routeWebSocket('**/realtime/v1/websocket*', socket => {
    socket.close();
  });

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname === '/api/auth/session' && method === 'GET') {
      const now = Date.now();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: authenticated
          ? {
              authenticated: true,
              expires_at: new Date(now + 60 * 60 * 1000).toISOString(),
              reauthenticated_at: new Date(now - 5_000).toISOString(),
            }
          : { authenticated: false },
      });
      return;
    }

    if (url.pathname === '/api/auth/webauthn/credentials' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          credentials: authenticated
            ? [{
                id: 'synthetic-credential-only',
                name: 'Passkey sintética de prueba',
                revoked_at: null,
                created_at: '2026-10-01T12:00:00.000Z',
              }]
            : [],
        },
      });
      return;
    }

    if (url.pathname === '/api/arkhe-round-preflight' && method === 'POST') {
      counters.preflightRequests.push(request.postDataJSON());
      await route.fulfill({
        status: preflightStatus,
        contentType: 'application/json',
        json: preflightStatus === 200
          ? syntheticPreflight()
          : { ok: false, error: 'Preflight sintético rechazado por la prueba.' },
      });
      return;
    }

    if (url.pathname === '/api/arkhe-core') {
      counters.coreActions.push({
        method,
        body: request.postDataJSON?.() ?? null,
      });
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        json: { ok: false, error: 'Acción Core no configurada en esta prueba sintética.' },
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      json: { ok: false, error: 'Ruta API no configurada en la prueba sintética.' },
    });
  });

  return counters;
}

async function openGovernment(page) {
  await page.getByRole('button', { name: 'Abrir navegación' }).click();
  await page.getByRole('button', { name: 'Gobierno humano' }).click();
  await expect(page.getByRole('heading', { name: 'Gobierno humano' })).toBeVisible();
}

test('el Dashboard carga en vista móvil sin errores no controlados de React', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await installSyntheticNetwork(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Arkhé Core' })).toBeVisible();
  await expect(page.getByText(/Preview aislado A\.4/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir navegación' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('Gobierno humano muestra el acceso esperado sin una sesión', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await installSyntheticNetwork(page, { authenticated: false });

  await page.goto('/');
  await openGovernment(page);
  await expect(page.getByText('Sin sesión', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Autenticar con passkey' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear ronda y convocatorias' })).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('el preflight muestra la ronda abierta y no invoca acciones mutables del Core', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const counters = await installSyntheticNetwork(page, { authenticated: true });

  await page.goto('/');
  await openGovernment(page);
  await expect(page.getByText('Reautenticación WebAuthn reciente. El servidor volverá a verificarla en cada acción.')).toBeVisible();

  await page.getByLabel('Pregunta de la ronda').fill(
    'Comprobar el preflight sintético sin crear registros.'
  );
  await page.getByRole('checkbox', { name: 'Atlas' }).check();
  await page.getByRole('button', { name: 'Revisar antes de crear' }).click();

  await expect(page.getByText('Preflight completado · revisión humana pendiente')).toBeVisible();
  await expect(page.getByText(/Ronda #1 · consulta · abierta/)).toBeVisible();
  await expect(page.getByText(/Preflight completado con advertencias/)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  expect(counters.preflightRequests).toHaveLength(1);
  expect(counters.preflightRequests[0]).toMatchObject({
    investigacion_codigo: 'A4-STAGE-001',
    tipo: 'consulta',
    participantes: [ATLAS_ID],
  });
  expect(counters.preflightRequests[0].pregunta).toBe(
    'Comprobar el preflight sintético sin crear registros.'
  );
  expect(counters.coreActions).toHaveLength(0);
  expect(pageErrors).toEqual([]);
});

test('un rechazo del preflight se muestra sin crear ni despachar una ronda', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const counters = await installSyntheticNetwork(page, {
    authenticated: true,
    preflightStatus: 503,
  });

  await page.goto('/');
  await openGovernment(page);
  await page.getByLabel('Pregunta de la ronda').fill('Probar rechazo de preflight sintético.');
  await page.getByRole('checkbox', { name: 'Atlas' }).check();
  await page.getByRole('button', { name: 'Revisar antes de crear' }).click();

  await expect(page.getByRole('status').filter({
    hasText: 'Preflight sintético rechazado por la prueba.',
  })).toBeVisible();

  expect(counters.preflightRequests).toHaveLength(1);
  expect(counters.coreActions).toHaveLength(0);
  expect(pageErrors).toEqual([]);
});
