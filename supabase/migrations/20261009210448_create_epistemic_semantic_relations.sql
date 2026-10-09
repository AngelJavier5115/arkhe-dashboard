-- Persistent semantic edges with provenance and append-only review history.
-- Existing legacy investigaciones.ref_id values are intentionally not backfilled as semantic claims.
create table if not exists public.arkhe_semantic_relations (
  id uuid primary key default gen_random_uuid(),
  source_node_id bigint not null references public.investigaciones(id) on delete restrict,
  target_node_id bigint not null references public.investigaciones(id) on delete restrict,
  relation_type text not null check (
    relation_type in ('supports', 'contradicts', 'derives_from', 'extends', 'questions', 'duplicates', 'describes')
  ),
  assertion text not null check (length(btrim(assertion)) >= 8),
  evidence_text text not null check (length(btrim(evidence_text)) >= 8),
  evidence_node_id bigint references public.investigaciones(id) on delete restrict,
  evidence_uri text,
  created_by_investigator_id uuid not null references public.investigadores(id) on delete restrict,
  origin_kind text not null check (origin_kind in ('human', 'investigator', 'system', 'import')),
  origin_channel text,
  provider text,
  model text,
  run_ref text,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  supersedes_relation_id uuid references public.arkhe_semantic_relations(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint arkhe_semantic_relations_distinct_nodes check (source_node_id <> target_node_id),
  constraint arkhe_semantic_relations_safe_evidence_uri check (
    evidence_uri is null or evidence_uri ~* '^https?://'
  )
);

create index if not exists arkhe_semantic_relations_source_idx
  on public.arkhe_semantic_relations (source_node_id, created_at desc);
create index if not exists arkhe_semantic_relations_target_idx
  on public.arkhe_semantic_relations (target_node_id, created_at desc);
create index if not exists arkhe_semantic_relations_type_idx
  on public.arkhe_semantic_relations (relation_type, created_at desc);
create index if not exists arkhe_semantic_relations_supersedes_idx
  on public.arkhe_semantic_relations (supersedes_relation_id)
  where supersedes_relation_id is not null;

create table if not exists public.arkhe_semantic_relation_events (
  id uuid primary key default gen_random_uuid(),
  relation_id uuid not null references public.arkhe_semantic_relations(id) on delete restrict,
  event_type text not null check (
    event_type in ('relation_created', 'relation_reviewed', 'relation_disputed', 'relation_rejected', 'relation_superseded', 'evidence_added', 'note_added')
  ),
  actor_investigator_id uuid not null references public.investigadores(id) on delete restrict,
  actor_kind text not null check (actor_kind in ('human', 'investigator', 'system', 'import')),
  event_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(event_payload) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists arkhe_semantic_relation_events_relation_idx
  on public.arkhe_semantic_relation_events (relation_id, created_at desc);

alter table public.arkhe_semantic_relations enable row level security;
alter table public.arkhe_semantic_relation_events enable row level security;

drop policy if exists arkhe_semantic_relations_read on public.arkhe_semantic_relations;
create policy arkhe_semantic_relations_read
  on public.arkhe_semantic_relations
  for select to anon, authenticated
  using (true);

drop policy if exists arkhe_semantic_relation_events_read on public.arkhe_semantic_relation_events;
create policy arkhe_semantic_relation_events_read
  on public.arkhe_semantic_relation_events
  for select to anon, authenticated
  using (true);

revoke all on table public.arkhe_semantic_relations from public, anon, authenticated;
revoke all on table public.arkhe_semantic_relation_events from public, anon, authenticated;
grant select on table public.arkhe_semantic_relations to anon, authenticated;
grant select on table public.arkhe_semantic_relation_events to anon, authenticated;
grant all on table public.arkhe_semantic_relations to service_role;
grant all on table public.arkhe_semantic_relation_events to service_role;

create or replace function public.arkhe_register_semantic_relation(
  p_source_node_id bigint,
  p_target_node_id bigint,
  p_relation_type text,
  p_assertion text,
  p_evidence_text text,
  p_evidence_node_id bigint,
  p_evidence_uri text,
  p_created_by_investigator_id uuid,
  p_origin_kind text,
  p_origin_channel text,
  p_provider text,
  p_model text,
  p_run_ref text,
  p_provenance jsonb,
  p_supersedes_relation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_relation_id uuid;
begin
  if p_source_node_id is null or p_target_node_id is null or p_source_node_id = p_target_node_id then
    raise exception 'Source and target must be two distinct existing nodes';
  end if;
  if p_relation_type is null or p_relation_type not in ('supports', 'contradicts', 'derives_from', 'extends', 'questions', 'duplicates', 'describes') then
    raise exception 'Unsupported semantic relation type';
  end if;
  if p_assertion is null or length(btrim(p_assertion)) < 8 then
    raise exception 'A meaningful relation assertion is required';
  end if;
  if p_evidence_text is null or length(btrim(p_evidence_text)) < 8 then
    raise exception 'Evidence or rationale text is required';
  end if;
  if p_origin_kind is null or p_origin_kind not in ('human', 'investigator', 'system', 'import') then
    raise exception 'Unsupported provenance origin kind';
  end if;
  if p_created_by_investigator_id is null then
    raise exception 'Creator investigator identity is required';
  end if;
  if p_provenance is null or jsonb_typeof(p_provenance) <> 'object' then
    raise exception 'Provenance must be a JSON object';
  end if;
  if p_evidence_uri is not null and p_evidence_uri !~* '^https?://' then
    raise exception 'Evidence URI must use HTTP or HTTPS';
  end if;

  insert into public.arkhe_semantic_relations (
    source_node_id, target_node_id, relation_type, assertion, evidence_text,
    evidence_node_id, evidence_uri, created_by_investigator_id, origin_kind,
    origin_channel, provider, model, run_ref, provenance, supersedes_relation_id
  ) values (
    p_source_node_id, p_target_node_id, p_relation_type, btrim(p_assertion), btrim(p_evidence_text),
    p_evidence_node_id, p_evidence_uri, p_created_by_investigator_id, p_origin_kind,
    nullif(btrim(p_origin_channel), ''), nullif(btrim(p_provider), ''),
    nullif(btrim(p_model), ''), nullif(btrim(p_run_ref), ''), p_provenance, p_supersedes_relation_id
  )
  returning id into new_relation_id;

  if p_supersedes_relation_id is not null then
    insert into public.arkhe_semantic_relation_events (
      relation_id, event_type, actor_investigator_id, actor_kind, event_payload
    ) values (
      p_supersedes_relation_id, 'relation_superseded', p_created_by_investigator_id, p_origin_kind,
      jsonb_build_object('superseded_by_relation_id', new_relation_id, 'reason', btrim(p_assertion))
    );
  end if;

  insert into public.arkhe_semantic_relation_events (
    relation_id, event_type, actor_investigator_id, actor_kind, event_payload
  ) values (
    new_relation_id, 'relation_created', p_created_by_investigator_id, p_origin_kind,
    jsonb_build_object(
      'relation_type', p_relation_type,
      'source_node_id', p_source_node_id,
      'target_node_id', p_target_node_id,
      'evidence_node_id', p_evidence_node_id,
      'evidence_uri', p_evidence_uri,
      'origin_channel', nullif(btrim(p_origin_channel), ''),
      'provider', nullif(btrim(p_provider), ''),
      'model', nullif(btrim(p_model), ''),
      'run_ref', nullif(btrim(p_run_ref), ''),
      'supersedes_relation_id', p_supersedes_relation_id
    )
  );

  return new_relation_id;
end;
$$;

revoke all on function public.arkhe_register_semantic_relation(
  bigint, bigint, text, text, text, bigint, text, uuid, text, text, text, text, text, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.arkhe_register_semantic_relation(
  bigint, bigint, text, text, text, bigint, text, uuid, text, text, text, text, text, jsonb, uuid
) to service_role;
