create unique index if not exists arkhe_webauthn_one_active_challenge_idx
  on public.arkhe_webauthn_challenges (investigator_id, purpose)
  where used_at is null;
