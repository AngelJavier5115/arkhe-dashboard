-- Durable idempotency ledger for signed Core-to-investigator dispatches.
-- This migration is for review only; do not apply to shared Supabase without separate approval.

CREATE TABLE IF NOT EXISTS public.core_dispatch_claims (
  dispatch_id uuid PRIMARY KEY,
  convocatoria_id uuid NOT NULL
    REFERENCES public.convocatorias_ronda(id) ON DELETE RESTRICT,
  service_id text NOT NULL
    CHECK (service_id IN ('atlas', 'aletheia', 'tekton')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_dispatch_claims_one_dispatch_per_invocation UNIQUE (convocatoria_id)
);

CREATE INDEX IF NOT EXISTS core_dispatch_claims_convocatoria_id_idx
  ON public.core_dispatch_claims (convocatoria_id, claimed_at DESC);

ALTER TABLE public.core_dispatch_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.core_dispatch_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.core_dispatch_claims TO service_role;

COMMENT ON TABLE public.core_dispatch_claims IS
  'Append-only audit and replay-prevention ledger: one accepted dispatch per convocatoria until manual reconciliation.';
COMMENT ON COLUMN public.core_dispatch_claims.dispatch_id IS
  'UUID signed by Core into the dispatch payload; primary key prevents replay of the same signed dispatch.';
