-- Keep semantic relation writes RPC-only after the API migration re-applies the base schema grants.
revoke insert, update, delete, truncate, references, trigger
  on table public.arkhe_semantic_relations
  from service_role;
revoke insert, update, delete, truncate, references, trigger
  on table public.arkhe_semantic_relation_events
  from service_role;

grant select on table public.arkhe_semantic_relations to service_role;
grant select on table public.arkhe_semantic_relation_events to service_role;

revoke all on table public.arkhe_semantic_write_windows
  from public, anon, authenticated, service_role;
