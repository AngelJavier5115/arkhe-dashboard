-- Require a recent successful WebAuthn ceremony before privileged governance
-- mutations or adding another human credential.

alter table if exists public.arkhe_human_sessions
  add column if not exists reauthenticated_at timestamptz;
