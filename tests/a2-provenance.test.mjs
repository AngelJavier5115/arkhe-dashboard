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

test('A2-A: the intended investigator can complete its own convocatoria', async () => {
  const { supabase, calls } = fakeSupabase(atlasConvocatoria);

  await assert.doesNotReject(() =>
    actionCompleteInvocation(supabase, {
      investigador_id: IDS.atlas,
      ronda_id: atlasConvocatoria.ronda_id,
      convocatoria_id: atlasConvocatoria.id,
      contenido: 'perspectiva de prueba'
    })
  );

  assert.equal(calls.rpc, 1);
  assert.equal(calls.lastRpcArgs.p_investigador_id, IDS.atlas);
});

test('A2-B: a different investigator UUID cannot complete Atlas convocatoria', async () => {
  const { supabase, calls } = fakeSupabase(atlasConvocatoria);

  await assert.rejects(
    () =>
      actionCompleteInvocation(supabase, {
        investigador_id: IDS.tekton,
        ronda_id: atlasConvocatoria.ronda_id,
        convocatoria_id: atlasConvocatoria.id,
        contenido: 'intento de suplantación lógica'
      }),
    /no coincide con la convocatoria/i
  );

  assert.equal(calls.rpc, 0);
});

test('A2-C: executor identity is not part of the current authorization decision', async () => {
  const { supabase, calls } = fakeSupabase(atlasConvocatoria);

  // This models a Tekton service (or any other executor) that has a valid
  // shared Core token and directly submits Atlas's UUID. The current Core
  // function receives no caller/service identity to compare against it.
  const body = {
    caller_service: 'tekton',
    investigador_id: IDS.atlas,
    ronda_id: atlasConvocatoria.ronda_id,
    convocatoria_id: atlasConvocatoria.id,
    contenido: 'suplantación de ejecutor'
  };

  await assert.doesNotReject(() => actionCompleteInvocation(supabase, body));
  assert.equal(calls.rpc, 1);
  assert.equal(calls.lastRpcArgs.p_investigador_id, IDS.atlas);
});
