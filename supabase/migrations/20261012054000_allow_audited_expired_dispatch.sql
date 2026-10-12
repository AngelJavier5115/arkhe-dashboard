-- Permit a reviewed audit note on a dispatch that expired without ever being claimed.
-- Keep all other lifecycle shapes strict; this migration does not change table privileges or RLS.
ALTER TABLE public.core_invocation_dispatches
  DROP CONSTRAINT IF EXISTS core_invocation_dispatches_claim_shape_ck;

ALTER TABLE public.core_invocation_dispatches
  ADD CONSTRAINT core_invocation_dispatches_claim_shape_ck CHECK (
    (status = 'issued'
      AND claimed_at IS NULL
      AND revoked_at IS NULL
      AND revoked_by IS NULL
      AND reconciliation_note IS NULL)
    OR
    (status = 'claimed'
      AND claimed_at IS NOT NULL
      AND revoked_at IS NULL
      AND revoked_by IS NULL
      AND reconciliation_note IS NULL)
    OR
    (status = 'expired'
      AND claimed_at IS NULL
      AND revoked_at IS NULL
      AND revoked_by IS NULL
      AND (
        reconciliation_note IS NULL
        OR length(btrim(reconciliation_note)) BETWEEN 10 AND 500
      ))
    OR
    (status = 'revoked'
      AND claimed_at IS NOT NULL
      AND revoked_at IS NOT NULL
      AND revoked_by IS NOT NULL
      AND reconciliation_note IS NOT NULL
      AND length(btrim(reconciliation_note)) BETWEEN 10 AND 500)
  );
