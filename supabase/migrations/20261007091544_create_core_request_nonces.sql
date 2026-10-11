create table public.core_request_nonces (
  nonce text primary key,
  service_id text not null check (service_id in ('atlas','aletheia','tekton')),
  request_timestamp bigint not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index core_request_nonces_expires_at_idx
  on public.core_request_nonces (expires_at);

alter table public.core_request_nonces enable row level security;

revoke all on table public.core_request_nonces from anon, authenticated;
grant insert on table public.core_request_nonces to anon, authenticated;

create policy core_request_nonces_insert
  on public.core_request_nonces
  for insert
  to anon, authenticated
  with check (
    service_id in ('atlas','aletheia','tekton')
    and length(nonce) between 16 and 256
  );
