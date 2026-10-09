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
