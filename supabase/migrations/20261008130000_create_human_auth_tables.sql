create table if not exists public.arkhe_human_credentials (
  id uuid primary key default gen_random_uuid(),
  investigator_id uuid not null,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports jsonb not null default '[]'::jsonb,
  name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.arkhe_webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  investigator_id uuid not null,
  challenge text not null,
  purpose text not null check (purpose in ('registration', 'authentication')),
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.arkhe_human_sessions (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null unique,
  investigator_id uuid not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists arkhe_webauthn_challenges_active_idx
  on public.arkhe_webauthn_challenges (purpose, investigator_id, challenge, expires_at)
  where used_at is null;

create unique index if not exists arkhe_webauthn_active_challenge_unique_idx
  on public.arkhe_webauthn_challenges (investigator_id, purpose)
  where used_at is null;

create index if not exists arkhe_human_sessions_active_idx
  on public.arkhe_human_sessions (session_hash, expires_at)
  where revoked_at is null;

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
  affected_rows integer := 0;
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

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on function public.arkhe_webauthn_reserve_attempt(uuid, integer) from public;
grant execute on function public.arkhe_webauthn_reserve_attempt(uuid, integer) to service_role;
