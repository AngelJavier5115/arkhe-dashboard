-- Tlacuilo has a dedicated cryptographic executor identity. It is distinct from
-- Atlas's signing service even though the one approved smoke proposal is
-- attributed to Atlas under a server-side, narrowly scoped delegation policy.
-- Apply only after reviewing the matching API/service-auth.js change.
alter table public.core_request_nonces
  drop constraint if exists core_request_nonces_service_id_check;

alter table public.core_request_nonces
  add constraint core_request_nonces_service_id_check
  check (service_id = any (array['atlas'::text, 'aletheia'::text, 'tekton'::text, 'tlacuilo'::text]));
