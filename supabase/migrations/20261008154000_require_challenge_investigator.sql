-- The initial challenge table allowed a nullable principal for compatibility with
-- the first draft. All current authentication challenges are investigator-bound.

alter table if exists public.arkhe_webauthn_challenges
  alter column investigator_id set not null;
