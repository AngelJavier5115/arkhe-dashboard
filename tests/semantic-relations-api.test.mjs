import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { buildSigningPayload } from '../api/service-auth.js';
import {
  authenticateSemanticActor,
  buildRelationProvenance,
  rejectClientIdentityClaims,
  validateCreateRelationBody,
  validateReviewRelationBody,
} from '../api/semantic-relations-logic.js';
import { createSemanticRelationsHandler } from '../api/semantic-relations.js';

const ANGEL_ID = '2a003935-f248-442c-96fc-dcee29c4d41a';
const ATLAS_ID = '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f';
const RELATION_ID = 'c6bbd0aa-4721-42a7-91e7-06a4d8f56d6c';
const atlasKeys = generateKeyPairSync('ed25519');
const publicKeyPem = atlasKeys.publicKey.export({ type: 'spki', format: 'pem' });
const privateKey = atlasKeys.privateKey;

function signedRequest(body, overrides = {}) {
  const serviceId = overrides.serviceId ?? 'atlas';
  const timestamp = overrides.timestamp ?? Date.now();
  const nonce = overrides.nonce ?? 'nonce-test-' + cryptoRandomSuffix();
  const signature = sign(
    null,
    Buffer.from(buildSigningPayload({ serviceId, timestamp, nonce, body }), 'utf8'),
    privateKey
  ).toString('base64url');
  return {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'x-arkhe-service-id': serviceId,
      'x-arkhe-timestamp': String(timestamp),
      'x-arkhe-nonce': nonce,
      'x-arkhe-signature': overrides.signature ?? signature,
    },
  };
}

function cryptoRandomSuffix() {
  return Math.random().toString(36).slice(2, 14);
}

function createFakeSupabase(options = {}) {
  const calls = [];
  const tableRows = [];
  return {
    calls,
    tableRows,
    from(table) {
      return {
        insert: async row => {
          calls.push({ kind: 'table-insert', table, row });
          if (options.nonceError && table === 'core_request_nonces') return { data: null, error: options.nonceError };
          tableRows.push({ table, row });
          return { data: row, error: null };
        },
      };
    },
    rpc: async (name, args) => {
      calls.push({ kind: 'rpc', name, args });
      if (name === 'arkhe_reserve_semantic_write') return { data: options.rateLimit ?? true, error: null };
      if (name === 'arkhe_register_semantic_relation') return { data: RELATION_ID, error: options.registerError ?? null };
      if (name === 'arkhe_append_semantic_relation_event') return { data: 'f49eeb10-34ae-47ca-9a47-f8123b1c004d', error: options.eventError ?? null };
      return { data: null, error: { message: 'Unexpected RPC ' + name } };
    },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    setHeader(name, value) { this.headers[name] = value; },
  };
}

function createCreateBody(overrides = {}) {
  return {
    action: 'create',
    source_node_id: 21,
    target_node_id: 22,
    relation_type: 'supports',
    assertion: 'El nodo de origen respalda la hipótesis indicada bajo estas condiciones.',
    evidence_text: 'El argumento del nodo de origen aporta evidencia pertinente y delimitada.',
    evidence_node_id: 21,
    evidence_uri: 'https://example.org/evidence',
    provider: 'provider-claimed-by-signed-service',
    model: 'model-claimed-by-signed-service',
    run_ref: 'round-8-invocation-12',
    ...overrides,
  };
}

async function withAtlasKey(callback) {
  const previous = process.env.ARKHE_ATLAS_PUBLIC_KEY;
  process.env.ARKHE_ATLAS_PUBLIC_KEY = publicKeyPem;
  try { return await callback(); }
  finally {
    if (previous === undefined) delete process.env.ARKHE_ATLAS_PUBLIC_KEY;
    else process.env.ARKHE_ATLAS_PUBLIC_KEY = previous;
  }
}

test('valid signed service authenticates its mapped investigator, not a body claim', async () => {
  await withAtlasKey(async () => {
    const body = createCreateBody();
    const req = signedRequest(body);
    const supabase = createFakeSupabase();
    const actor = await authenticateSemanticActor(req, body, {
      supabase,
      getHumanSession: async () => { throw new Error('service must not fall back to cookie auth'); },
      requireSameOrigin: () => { throw new Error('service must not depend on browser origin'); },
    });

    assert.equal(actor.kind, 'investigator');
    assert.equal(actor.investigatorId, ATLAS_ID);
    assert.equal(actor.authentication.signature_verified, true);
    assert.equal(supabase.tableRows.length, 1);
    assert.equal(supabase.tableRows[0].row.service_id, 'atlas');
  });
});

test('a valid signature cannot be reused because the nonce is one-use', async () => {
  await withAtlasKey(async () => {
    const body = createCreateBody();
    const req = signedRequest(body, { nonce: 'nonce-replay-test-001' });
    const supabase = createFakeSupabase({ nonceError: { code: '23505' } });
    await assert.rejects(
      () => authenticateSemanticActor(req, body, { supabase, getHumanSession: async () => null, requireSameOrigin() {} }),
      error => error?.status === 401 && /Nonce ya utilizado/.test(error.message)
    );
  });
});

test('tampered and expired service signatures are rejected before nonce registration', async () => {
  await withAtlasKey(async () => {
    const body = createCreateBody();
    const tampered = signedRequest(body, { signature: 'bm90LWEtdmFsaWQtc2lnbmF0dXJl' });
    const supabase = createFakeSupabase();
    await assert.rejects(
      () => authenticateSemanticActor(tampered, body, { supabase, getHumanSession: async () => null, requireSameOrigin() {} }),
      error => error?.status === 401
    );
    const stale = signedRequest(body, { timestamp: Date.now() - 10 * 60 * 1000 });
    await assert.rejects(
      () => authenticateSemanticActor(stale, body, { supabase, getHumanSession: async () => null, requireSameOrigin() {} }),
      error => error?.status === 401
    );
    assert.equal(supabase.tableRows.length, 0);
  });
});

test('partial service headers cannot downgrade to a valid human cookie session', async () => {
  const req = { headers: { 'x-arkhe-service-id': 'atlas' } };
  await assert.rejects(
    () => authenticateSemanticActor(req, {}, {
      supabase: createFakeSupabase(),
      getHumanSession: async () => ({ investigatorId: ANGEL_ID, reauthenticatedAt: new Date().toISOString() }),
      requireSameOrigin() {},
    }),
    error => error?.status === 503 || error?.status === 401
  );
});

test('human writes require same origin, a current Ángel session, and recent WebAuthn reauthentication', async () => {
  const supabase = createFakeSupabase();
  let originChecked = false;
  const req = { headers: { origin: 'https://arkhe.example' } };
  const actor = await authenticateSemanticActor(req, {}, {
    supabase,
    requireSameOrigin: request => { originChecked = request.headers.origin === 'https://arkhe.example'; },
    getHumanSession: async () => ({ investigatorId: ANGEL_ID, reauthenticatedAt: new Date().toISOString() }),
  });
  assert.equal(originChecked, true);
  assert.equal(actor.kind, 'human');
  assert.equal(actor.investigatorId, ANGEL_ID);
  assert.equal(actor.authentication.recent_reauthentication_verified, true);
  assert.equal(buildRelationProvenance(actor).provider_attestation.status, 'not_independently_verified');

  await assert.rejects(
    () => authenticateSemanticActor(req, {}, {
      supabase,
      requireSameOrigin() {},
      getHumanSession: async () => ({ investigatorId: ANGEL_ID, reauthenticatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString() }),
    }),
    error => error?.status === 401
  );
});

test('forged identity and origin fields are rejected instead of being stored', () => {
  assert.throws(
    () => rejectClientIdentityClaims({ action: 'create', created_by_investigator_id: ATLAS_ID }),
    error => error?.status === 400
  );
  assert.throws(
    () => rejectClientIdentityClaims({ action: 'create', origin_kind: 'human' }),
    error => error?.status === 400
  );
  assert.throws(
    () => rejectClientIdentityClaims({ action: 'create', provenance: { authentication: { method: 'fake' } } }),
    error => error?.status === 400
  );
});

test('relation validator requires distinct positive nodes, supported type, assertion, evidence and safe URI', () => {
  const actor = { kind: 'human', investigatorId: ANGEL_ID };
  const valid = validateCreateRelationBody(createCreateBody({ provider: undefined, model: undefined }), actor);
  assert.equal(valid.sourceNodeId, 21);
  assert.equal(valid.targetNodeId, 22);
  assert.equal(valid.provider, null);

  assert.throws(() => validateCreateRelationBody(createCreateBody({ target_node_id: 21 }), actor), error => error?.status === 400);
  assert.throws(() => validateCreateRelationBody(createCreateBody({ source_node_id: -1 }), actor), error => error?.status === 400);
  assert.throws(() => validateCreateRelationBody(createCreateBody({ relation_type: 'guaranteed_true' }), actor), error => error?.status === 400);
  assert.throws(() => validateCreateRelationBody(createCreateBody({ evidence_text: 'short' }), actor), error => error?.status === 400);
  assert.throws(() => validateCreateRelationBody(createCreateBody({ evidence_uri: 'javascript:alert(1)' }), actor), error => error?.status === 400);
});

test('review validator requires a note and only accepts governed event types', () => {
  const valid = validateReviewRelationBody({
    action: 'review',
    relation_id: RELATION_ID,
    event_type: 'relation_disputed',
    note: 'La evidencia citada no respalda todavía la afirmación en su alcance actual.',
  });
  assert.equal(valid.eventType, 'relation_disputed');
  assert.ok(valid.eventPayload.note);
  assert.throws(() => validateReviewRelationBody({
    action: 'review', relation_id: RELATION_ID, event_type: 'relation_created', note: 'No es una revisión permitida.',
  }), error => error?.status === 400);
  assert.throws(() => validateReviewRelationBody({
    action: 'review', relation_id: RELATION_ID, event_type: 'relation_reviewed', note: 'short',
  }), error => error?.status === 400);
});

test('POST creation uses server-derived actor and RPC instead of direct table writes', async () => {
  await withAtlasKey(async () => {
    const body = createCreateBody();
    const req = signedRequest(body);
    const supabase = createFakeSupabase();
    const res = createResponse();
    const handler = createSemanticRelationsHandler({
      getSupabase: () => supabase,
      getHumanSession: async () => null,
      requireSameOrigin: () => { throw new Error('must not use origin for a signed service'); },
    });

    await handler(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.relation_id, RELATION_ID);
    const calls = supabase.calls.filter(call => call.kind === 'rpc');
    assert.deepEqual(calls.map(call => call.name), ['arkhe_reserve_semantic_write', 'arkhe_register_semantic_relation']);
    const registerArgs = calls[1].args;
    assert.equal(registerArgs.p_created_by_investigator_id, ATLAS_ID);
    assert.equal(registerArgs.p_origin_kind, 'investigator');
    assert.equal(registerArgs.p_origin_channel, 'signed-service-api');
    assert.equal(registerArgs.p_provenance.authentication.service_id, 'atlas');
    assert.equal(registerArgs.p_provenance.provider_attestation.status, 'not_independently_verified');
    assert.equal(registerArgs.p_provider, body.provider);
  });
});

test('human review calls only the append-event RPC and cannot submit a spoofed actor', async () => {
  const body = {
    action: 'review',
    relation_id: RELATION_ID,
    event_type: 'relation_reviewed',
    note: 'Se revisaron las afirmaciones y las fuentes identificadas, sin declarar prueba concluyente.',
  };
  const req = { method: 'POST', body, headers: { 'content-type': 'application/json', origin: 'https://arkhe.example' } };
  const supabase = createFakeSupabase();
  const res = createResponse();
  const handler = createSemanticRelationsHandler({
    getSupabase: () => supabase,
    getHumanSession: async () => ({ investigatorId: ANGEL_ID, reauthenticatedAt: new Date().toISOString() }),
    requireSameOrigin: request => assert.equal(request.headers.origin, 'https://arkhe.example'),
  });

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const calls = supabase.calls.filter(call => call.kind === 'rpc');
  assert.deepEqual(calls.map(call => call.name), ['arkhe_reserve_semantic_write', 'arkhe_append_semantic_relation_event']);
  assert.equal(calls[1].args.p_actor_investigator_id, ANGEL_ID);
  assert.equal(calls[1].args.p_actor_kind, 'human');

  const forgedRes = createResponse();
  const forgedHandler = createSemanticRelationsHandler({
    getSupabase: () => createFakeSupabase(),
    getHumanSession: async () => ({ investigatorId: ANGEL_ID, reauthenticatedAt: new Date().toISOString() }),
    requireSameOrigin() {},
  });
  await forgedHandler({ ...req, body: { ...body, created_by_investigator_id: ATLAS_ID } }, forgedRes);
  assert.equal(forgedRes.statusCode, 400);
});

test('signed investigators cannot review or supersede relations and rate limits return 429', async () => {
  await withAtlasKey(async () => {
    const reviewReq = signedRequest({
      action: 'review', relation_id: RELATION_ID,
      event_type: 'relation_rejected', note: 'Rechazar esta relación por falta de evidencia suficiente.',
    });
    const reviewSupabase = createFakeSupabase();
    const reviewRes = createResponse();
    await createSemanticRelationsHandler({ getSupabase: () => reviewSupabase }) (reviewReq, reviewRes);
    assert.equal(reviewRes.statusCode, 403);
    assert.equal(reviewSupabase.calls.some(call => call.name === 'arkhe_append_semantic_relation_event'), false);

    const rateLimitedSupabase = createFakeSupabase({ rateLimit: false });
    const rateLimitedRes = createResponse();
    await createSemanticRelationsHandler({ getSupabase: () => rateLimitedSupabase }) (
      signedRequest(createCreateBody()),
      rateLimitedRes
    );
    assert.equal(rateLimitedRes.statusCode, 429);
    assert.equal(rateLimitedSupabase.calls.some(call => call.name === 'arkhe_register_semantic_relation'), false);
  });
});

test('endpoint rejects non-POST and non-JSON requests before connecting to Supabase', async () => {
  const handler = createSemanticRelationsHandler({
    getSupabase: () => { throw new Error('Supabase should not be touched'); },
  });
  const getRes = createResponse();
  await handler({ method: 'GET', headers: {} }, getRes);
  assert.equal(getRes.statusCode, 405);

  const contentTypeRes = createResponse();
  await handler({ method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }, contentTypeRes);
  assert.equal(contentTypeRes.statusCode, 415);
});
