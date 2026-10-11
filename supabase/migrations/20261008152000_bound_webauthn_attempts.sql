-- Bound the number of WebAuthn verification attempts for a single challenge.
-- This limits repeated invalid assertions without weakening challenge single-use semantics.

alter table if exists public.arkhe_webauthn_challenges
  add column if not exists attempts integer not null default 0;

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
