# Arkhé Core — roadmap and closure gates (October 2026)

## Governing rule

\`main\` is frozen. No audit or design branch is merged, promoted, or activated in Production without Ángel's explicit authorization. A green build is necessary but does not prove runtime security. Do not invent epistemic relations to exercise software.

## Current repository anchors

- \`main\`: \`485d339de64c72dab5f7ee3af7a3bd10fb0e0029\` (unchanged).
- \`audit/a2-provenance-boundary\`: technical closure of the service-to-investigator identity boundary; no production merge.
- \`audit/a4-human-auth\`: WebAuthn human-governance boundary; implementation and CI exist, but runtime closure gates remain.
- \`design/tree-network-dashboard\`: visual redesign, interactive knowledge graph, persistent semantic-relation schema/API, and read-only provenance display.

## Track S — security and identity

### A.2 — Signed investigator identity: TECHNICALLY CLOSED

Demonstrated in adversarial HTTP tests:

- Ed25519 service signatures bind service identity, timestamp, nonce and canonical body.
- Service identity maps to its investigator; a service cannot claim another investigator by changing the body.
- Tampered body, wrong key, stale timestamp and nonce replay are rejected.
- Nonces are stored with a unique constraint and retained beyond their acceptance window.

Not authorized/completed: production activation or merge into \`main\`.

### A.4 — Human authentication: IMPLEMENTED, NOT CLOSED

Design and implementation use WebAuthn/passkeys, opaque revocable sessions, same-origin controls and recent reauthentication. The current A.4 gate requires:

1. Current CI green.
2. READY Preview and configuration review without exposing secrets.
3. First real passkey enrollment in controlled Preview.
4. A second recovery credential enrolled and verified.
5. Revocation tests, including refusing to revoke the final active credential.
6. Runtime adversarial tests: no session, forged actor, cross-origin request, expired/replayed challenge, incorrect origin/RP ID, unregistered/revoked credential, stale reauthentication and direct private-endpoint access.
7. Remove the bootstrap secret/expiry immediately after initial enrollment.
8. Final review of credentials, challenges, sessions and logs.

The human registration/review path is not yet integrated end-to-end into the design Preview. Production WebAuthn enrollment is not authorized.

### A.5 — Independent provider provenance: PLANNED

Maintain three distinct evidence levels:

- A: a signed investigator reports what it observed in the provider response;
- B: an independent provider-side record can be queried and correlated;
- C: a verifiable cryptographic provider attestation exists.

Do not call A-level evidence provider-verified. The next research/design task is to identify practical provider-side records and correlation IDs for each actual route (OpenAI, OpenRouter, Gemini, Groq), including availability and operational cost.

## Track E — epistemic network and Dashboard

### E.1 — Visual graph: IMPLEMENTED IN DESIGN PREVIEW

The branch adds the tree/network view, mobile-friendly node inspector, explicit directional legacy references, semantic edge coloring, and provenance/history display. The text and status of a node never automatically establish a scientific relationship.

### E.2 — Persistent semantic schema and read path: IMPLEMENTED

Tables:

- \`arkhe_semantic_relations\`: directed type, assertion, evidence, creator, source/provenance metadata, optional supersession.
- \`arkhe_semantic_relation_events\`: append-only creation/review/dispute/rejection/evidence/note history.

Both have RLS enabled. Public browser clients have read access only; direct table DML is revoked for \`service_role\` as defense in depth. Writes go through restricted server-authorized RPCs. Legacy \`investigaciones.ref_id\` rows are not backfilled as semantic claims.

### E.3 — Secure write API: IMPLEMENTED, LIVE GATE PENDING

\`POST /api/semantic-relations\` supports creating proposals from signed A.2 investigators and appending review events from Ángel after recent A.4 WebAuthn reauthentication. Actor identity is derived server-side, not trusted from the request body. The endpoint has input validation, replay protection and a server-side write limit.

Verified so far:

- Unit/adversarial suite and frontend build passed.
- Preview environment has the branch-scoped sensitive \`SUPABASE_SERVICE_ROLE_KEY\`.
- Authenticated Preview inspection returns 405 / Allow: POST for GET.
- The latest public-runner probe received HTTP 302 at Vercel Deployment Protection. Do not disable protection to make a generic CI runner reach the Preview.

Still pending:

1. Run one real signed request through an authorized A.2 client.
2. Before a persistent write, Ángel approves the actual source/target nodes, relation type, assertion and evidence.
3. Confirm exactly one relation and one creation event, correct derived investigator identity/provenance and no collateral writes.
4. Integrate A.4 WebAuthn UI/API into this branch for human review.
5. Add secure UI forms for proposal/review only after the runtime gates pass.
6. Conduct final API/security review before opening a non-draft integration PR.

Current semantic data state on the project: 0 semantic relations and 0 relation events. A live signed proposal has not been accepted.

## Critical path / next actions

1. Keep the default CI limited to deterministic unit/adversarial tests and build. Treat protected Preview access as a separate authorized runtime gate.
2. Decide and approve a meaningful existing node pair for the first live relation smoke test. Candidate nodes #5 and #6 contain closely related statements about event-driven architecture and synchronization; this is only a candidate, not an approved or recorded relation.
3. Use an actual signed A.2 investigator client for the live request; do not move its private key into a workflow, browser or repository.
4. Verify the resulting database records and provenance. If the correct signed client cannot be operated in a controlled way, stop and first add a secured test harness rather than generating fake knowledge.
5. Integrate A.4 session UI/routes into the design branch and complete its real WebAuthn closure gates.
6. Start A.5 provider-side evidence research/design.
7. Only after these gates: review the full branch diff and discuss a coordinated merge strategy. No automatic merge or Production activation.

## Explicit no-go conditions

- No \`main\` merge without explicit authorization.
- No Production service-role key.
- No Production passkey/bootstrap enrollment.
- No disabling Vercel Preview protection solely to simplify tests.
- No valid private signing key or privileged database key in the browser, repository, logs or ChatGPT messages.
- No fake relation rows or claims of provider verification without independent evidence.
