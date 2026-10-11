alter table if exists public.arkhe_human_credentials
  rename column user_id to investigator_id;

alter table if exists public.arkhe_webauthn_challenges
  rename column user_id to investigator_id;

alter table if exists public.arkhe_human_sessions
  rename column user_id to investigator_id;
