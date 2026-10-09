# Arkhé semantic relations — v1

## Purpose

The graph renders persisted semantic assertions separately from legacy \`investigaciones.ref_id\` references. It must not infer scientific meaning from prose, node status, visual proximity, author, or model output.

## Relation assertion

Each row in \`public.arkhe_semantic_relations\` connects two distinct existing knowledge nodes and records:

- controlled relation type: \`supports\`, \`contradicts\`, \`derives_from\`, \`extends\`, \`questions\`, \`duplicates\`, or \`describes\`;
- an explicit assertion and non-empty evidence/rationale text;
- optional evidence node or HTTP(S) source URI;
- investigator identity, origin kind, channel, provider, model, run reference, and structured provenance;
- optional superseding relation ID, so later corrections remain traceable rather than replacing the old claim.

## History and provenance

\`public.arkhe_semantic_relation_events\` stores append-only review events: created, reviewed, disputed, rejected, superseded, evidence added, and note added. The graph distinguishes declared evidence, relation status, and independent verification. A \`relation_reviewed\` event records that a review was made; it does not by itself mean the scientific claim was proven.

## Security boundary

- Both new tables have RLS enabled and public read-only policies, matching the public read-only graph experience.
- \`anon\` and \`authenticated\` can select; they cannot insert, update, or delete.
- The service-role key can select but has direct table \`INSERT\`/\`UPDATE\`/\`DELETE\` revoked; registration is available only through \`arkhe_register_semantic_relation\`, executable by \`service_role\`. That function validates endpoints, type, assertion, evidence, source identity, and provenance and writes a creation event transactionally.
- Do not call the function from the browser. The follow-up API must authenticate the human/agent actor first and derive the actor identity server-side; A.4 human auth and A.2 signed investigator auth remain the permitted boundaries.
- Existing tables/policies are not modified.
- Existing \`ref_id\` values are not backfilled as semantic relations. No relation rows are seeded during this migration.

## Rollout stages

1. Schema and read-only graph ingestion (applied to the Arkhé Supabase project).
2. Server endpoint and database RPCs are implemented in the design branch. The endpoint requires either a signed A.2 investigator request with a one-use nonce or an A.4 human session with recent WebAuthn reauthentication. It has a fixed-window write limit and does not accept actor identity from the request body.
3. The creation/review form and same-origin A.4 login flow are not yet integrated into this design Preview. Preview runtime also remains gated on branch-specific server environment configuration.
4. GitHub Actions now exercises adversarial cases for forged actor fields, invalid/stale signatures, nonce replay, missing/recent human reauthentication, invalid relation input, governed review events, and write throttling. A live signed-request smoke test is still pending.

No semantic relation is seeded by the migration. The tables remain empty until the authenticated registration endpoint accepts a proposal. A persisted proposal is not automatically reviewed or scientifically validated.
