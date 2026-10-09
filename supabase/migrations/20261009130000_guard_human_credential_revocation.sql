-- Serialize credential revocation for Arkhé's human governor and
-- prevent revoking the final active recovery path.
create or replace function public.arkhe_revoke_human_credential(
  p_credential_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer := 0;
  affected_rows integer := 0;
  human_investigator_id constant uuid := '2a003935-f248-442c-96fc-dcee29c4d41a';
begin
  -- Lock the canonical investigator row so simultaneous requests cannot
  -- both pass the active-credential count and revoke the last two keys.
  perform 1
    from public.investigadores
   where id = human_investigator_id
   for update;

  if not found then
    raise exception 'Canonical human investigator was not found';
  end if;

  select count(*)
    into active_count
    from public.arkhe_human_credentials
   where investigator_id = human_investigator_id
     and revoked_at is null;

  if active_count <= 1 then
    return false;
  end if;

  update public.arkhe_human_credentials
     set revoked_at = now()
   where id = p_credential_id
     and investigator_id = human_investigator_id
     and revoked_at is null;

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on function public.arkhe_revoke_human_credential(uuid) from public;
grant execute on function public.arkhe_revoke_human_credential(uuid) to service_role;
