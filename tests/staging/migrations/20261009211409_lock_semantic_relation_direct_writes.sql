-- Staging-only copy for the isolated A.4 preview. Canonical source: supabase/migrations/20261009211409_lock_semantic_relation_direct_writes.sql on design/tree-network-dashboard.
-- Apply only after tests/staging/a4-staging-foundation.sql. Do not replay against shared arkhe-core as part of this bootstrap.

-- Force all semantic-relation writes through the validated transaction function.
-- Server code can read directly, but cannot bypass validation with table DML.
revoke insert, update, delete, truncate, references, trigger
  on table public.arkhe_semantic_relations
  from service_role;
revoke insert, update, delete, truncate, references, trigger
  on table public.arkhe_semantic_relation_events
  from service_role;

grant select on table public.arkhe_semantic_relations to service_role;
grant select on table public.arkhe_semantic_relation_events to service_role;

-- The SECURITY DEFINER registration function is owned by the migration owner,
-- so its atomic inserts still work while direct service-role table writes do not.
