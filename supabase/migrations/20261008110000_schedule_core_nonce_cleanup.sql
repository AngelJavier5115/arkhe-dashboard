create extension if not exists pg_cron;

create or replace function public.arkhe_cleanup_expired_core_request_nonces()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.core_request_nonces
  where expires_at < now() - interval '24 hours';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.arkhe_cleanup_expired_core_request_nonces() from public, anon, authenticated;

select cron.schedule(
  'arkhe-cleanup-expired-core-request-nonces',
  '17 3 * * *',
  'select public.arkhe_cleanup_expired_core_request_nonces();'
);
