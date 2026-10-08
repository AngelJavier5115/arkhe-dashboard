-- A.4 corrective migration for the first human-auth schema draft.
-- The initial A.4 migration used user_id; the application boundary uses investigator_id.
-- This migration is safe for fresh databases and repairs databases where the first draft
-- was already applied. Challenges are ephemeral, so orphaned/null principal rows are removed.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'arkhe_human_credentials'
      and column_name = 'user_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'arkhe_human_credentials'
      and column_name = 'investigator_id'
  ) then
    alter table public.arkhe_human_credentials rename column user_id to investigator_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'arkhe_webauthn_challenges'
      and column_name = 'user_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'arkhe_webauthn_challenges'
      and column_name = 'investigator_id'
  ) then
    alter table public.arkhe_webauthn_challenges rename column user_id to investigator_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'arkhe_human_sessions'
      and column_name = 'user_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'arkhe_human_sessions'
      and column_name = 'investigator_id'
  ) then
    alter table public.arkhe_human_sessions rename column user_id to investigator_id;
  end if;
end $$;

alter table public.arkhe_webauthn_challenges
  add column if not exists attempts integer not null default 0;

-- Challenges are short-lived and have no valid meaning without a bound principal.
delete from public.arkhe_webauthn_challenges
where investigator_id is null;

alter table public.arkhe_webauthn_challenges
  alter column investigator_id set not null;

create unique index if not exists arkhe_webauthn_active_challenge_unique_idx
  on public.arkhe_webauthn_challenges (investigator_id, purpose)
  where used_at is null;

create or replace function public.arkhe_webauthn_reserve_attempt(
  p_challenge_id uuid,
  p_max_attempts integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved boolean := false;
begin
  if p_max_attempts < 1 then
    raise exception 'p_max_attempts must be positive';
  end if;

  update public.arkhe_webauthn_challenges
     set attempts = attempts + 1
   where id = p_challenge_id
     and used_at is null
     and expires_at > now()
     and attempts < p_max_attempts;

  get diagnostics reserved = row_count > 0;
  return reserved;
end;
$$;

revoke all on function public.arkhe_webauthn_reserve_attempt(uuid, integer) from public;
grant execute on function public.arkhe_webauthn_reserve_attempt(uuid, integer) to service_role;
