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
- Registration is available only through \`arkhe_register_semantic_relation\`, granted to \`service_role\`. That function validates endpoints, type, assertion, evidence, source identity, and provenance and writes a creation event transactionally.
- Do not call the function from the browser. The follow-up API must authenticate the human/agent actor first and derive the actor identity server-side; A.4 human auth and A.2 signed investigator auth remain the permitted boundaries.
- Existing tables/policies are not modified.
- Existing \`ref_id\` values are not backfilled as semantic relations. No relation rows are seeded during this migration.

## Rollout stages

1. Schema and read-only graph ingestion (this migration).
2. Secure authenticated registration/review endpoint on the server, integrated with A.2/A.4.
3. UI creation/review tools behind that endpoint.
4. Adversarial tests for forged actor, unauthorized direct RPC, incomplete evidence, replay, malformed provenance, invalid node IDs, and superseding history.

The schema exists after stage 1, but no semantic relationship is considered recorded until the authorized registration endpoint writes it. The new tables are initially empty.
