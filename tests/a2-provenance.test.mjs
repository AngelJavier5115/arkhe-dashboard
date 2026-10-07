import test from 'node:test';
import assert from 'node:assert/strict';
import { actionCompleteInvocation } from '../api/arkhe-core.js';

const IDS = {
  atlas: '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f',
  tekton: '656726d1-8209-4240-8169-a7434074609d'
};

function fakeSupabase(convocatoria) {
  const calls = { rpc: 0, update: 0, lastRpcArgs: null };

  const table = {
    select() { return this; },
    eq() { return this; },
    single: async () => ({ data: convocatoria, error: null }),
    update() { calls.update += 1; return this; }
  };

  const supabase = {
    from() { return table; },
    rpc: async (_name, args) => {
      calls.rpc += 1;
      calls.lastRpcArgs = args;
      return {
        data: { id: 'intervencion-test', ...args },
        error: null
      };
    }
  };

  return { supabase, calls };
}

const atlasConvocatoria = {
  id: 'conv-atlas-test',
  ronda_id: 'round-a2-test',
  investigador_id: IDS.atlas,
  foco_intervencion_id: null,
  estado: 'enviada'
};

const atlasService = {
  serviceId: 'atlas',
  investigadorId: IDS.atlas
};

const tektonService = {
  serviceId: 'tekton',
  investigadorId: IDS.tekton
};

test('A2-A: the authenticated Atlas service can complete its own convocatoria', async () => {
  const { supabase, calls } = fakeSupabase(atlasConvocatoria);

  await assert.doesNotReject(() =>
    actionCompleteInvocation(supabase, {
      investigador_id: IDS.atlas,
      ronda_id: atlasConvocatoria.ronda_id,
      convocatoria_id: atlasConvocatoria.id,
      contenido: 'perspectiva de prueba'
    }, atlasService)
  );

  assert.equal(calls.rpc, 1);
  assert.equal(calls.lastRpcArgs.p_investigador_id, IDS.atlas);
});

test('A2-B: a different logical investigator cannot complete Atlas convocatoria', async () => {
  const { supabase, calls } = fakeSupabase(atlasConvocatoria);

  await assert.rejects(
    () =>
      actionCompleteInvocation(supabase, {
        investigador_id: IDS.tekton,
        ronda_id: atlasConvocatoria.ronda_id,
        convocatoria_id: atlasConvocatoria.id,
        contenido: 'intento de suplantación lógica'
      }, atlasService),
    /no coincide con la identidad del servicio/i
  );

  assert.equal(calls.rpc, 0);
});

test('A2-C: a Tekton executor cannot submit Atlas identity even with a valid service signature', async () => {
  const { supabase, calls } = fakeSupabase(atlasConvocatoria);

  await assert.rejects(
    () =>
      actionCompleteInvocation(supabase, {
        investigador_id: IDS.atlas,
        ronda_id: atlasConvocatoria.ronda_id,
        convocatoria_id: atlasConvocatoria.id,
        contenido: 'suplantación de ejecutor'
      }, tektonService),
    /no coincide con la identidad del servicio/i
  );

  assert.equal(calls.rpc, 0);
});

test('A2-D: model/provider provenance remains an authenticated service assertion', async () => {
  const { supabase, calls } = fakeSupabase(atlasConvocatoria);

  await assert.doesNotReject(() =>
    actionCompleteInvocation(supabase, {
      investigador_id: IDS.atlas,
      ronda_id: atlasConvocatoria.ronda_id,
      convocatoria_id: atlasConvocatoria.id,
      contenido: 'procedencia de modelo de prueba',
      modelo: 'fabricated-model-should-not-be-trusted',
      proveedor: 'fabricated-provider'
    }, atlasService)
  );

  assert.equal(calls.lastRpcArgs.p_metadata.modelo, 'fabricated-model-should-not-be-trusted');
  assert.equal(calls.lastRpcArgs.p_metadata.proveedor, 'fabricated-provider');
  assert.equal(calls.lastRpcArgs.p_metadata.servicio_autenticado, 'atlas');
});

test('A2-E: direct invocation without authenticated service identity is rejected', async () => {
  const { supabase, calls } = fakeSupabase(atlasConvocatoria);

  await assert.rejects(
    () =>
      actionCompleteInvocation(supabase, {
        investigador_id: IDS.atlas,
        ronda_id: atlasConvocatoria.ronda_id,
        convocatoria_id: atlasConvocatoria.id,
        contenido: 'sin identidad de ejecutor'
      }),
    /identidad de servicio requerida/i
  );

  assert.equal(calls.rpc, 0);
});
