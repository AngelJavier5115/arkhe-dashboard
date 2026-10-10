-- Enforce the first Tlacuilo delegation as a true one-shot at the database layer.
-- The runner's read-only preflight is not an authorization boundary: a caller could
-- submit the same approved payload again with a fresh nonce.
-- The API builds this provenance policy ID from the authenticated Tlacuilo service.
create unique index if not exists arkhe_semantic_relations_tlacuilo_policy_once_idx
  on public.arkhe_semantic_relations ((provenance #>> '{delegation,policy_id}'))
  where (provenance #>> '{delegation,policy_id}') = 'tlacuilo-smoke-relation-5-6-duplicates-v1';
