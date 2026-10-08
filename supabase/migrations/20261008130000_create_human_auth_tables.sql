create table if not exists public.arkhe_human_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
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
  user_id uuid,
  challenge text not null,
  purpose text not null check (purpose in ('registration', 'authentication')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.arkhe_human_sessions (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null unique,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists arkhe_webauthn_challenges_active_idx
  on public.arkhe_webauthn_challenges (purpose, challenge, expires_at)
  where used_at is null;

create index if not exists arkhe_human_sessions_active_idx
  on public.arkhe_human_sessions (session_hash, expires_at)
  where revoked_at is null;
