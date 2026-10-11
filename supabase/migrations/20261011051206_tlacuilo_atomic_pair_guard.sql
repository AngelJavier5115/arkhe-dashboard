-- Serialize semantic-relation inserts for the same unordered node pair.
-- This closes the gap between API preflight and the final RPC insert for the
-- one-shot Tlacuilo policy. Every insert for a pair takes the same transaction
-- advisory lock, and a Tlacuilo-policy insert re-checks the pair while holding it.
-- Apply only through reviewed migrations; this file is not applied by this PR.
create or replace function public.arkhe_guard_tlacuilo_one_shot_pair()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pair_key text;
begin
  pair_key := least(new.source_node_id, new.target_node_id)::text
    || ':' ||
    greatest(new.source_node_id, new.target_node_id)::text;

  -- Advisory locks are transaction-scoped. Serializing all relation inserts for
  -- the same unordered pair ensures the next statement sees a prior committed row.
  perform pg_advisory_xact_lock(20261011, hashtext(pair_key));

  -- The delegated pair is exclusive in both directions: if Tlacuilo arrives
  -- after any relation, reject it; if Tlacuilo arrives first, reject later
  -- inserts for that pair too. The shared advisory lock makes both outcomes
  -- deterministic under concurrent transactions.
  if exists (
    select 1
    from public.arkhe_semantic_relations existing
    where (
      (
        existing.source_node_id = new.source_node_id
        and existing.target_node_id = new.target_node_id
      ) or (
        existing.source_node_id = new.target_node_id
        and existing.target_node_id = new.source_node_id
      )
    )
    and (
      new.provenance #>> '{delegation,policy_id}' =
        'tlacuilo-smoke-relation-5-6-duplicates-v1'
      or existing.provenance #>> '{delegation,policy_id}' =
        'tlacuilo-smoke-relation-5-6-duplicates-v1'
    )
  ) then
    raise exception using
      errcode = '23505',
      message = 'Tlacuilo one-shot pair guard: the unordered node pair is occupied or sealed by the one-shot policy; do not retry automatically';
  end if;

  return new;
end;
$$;

drop trigger if exists arkhe_semantic_relations_tlacuilo_pair_guard
  on public.arkhe_semantic_relations;

create trigger arkhe_semantic_relations_tlacuilo_pair_guard
before insert on public.arkhe_semantic_relations
for each row
execute function public.arkhe_guard_tlacuilo_one_shot_pair();
