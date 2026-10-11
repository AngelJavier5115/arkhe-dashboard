-- One-shot signed dispatch claims for human-authorized investigator convocations.
-- Prepared for review only. Do not apply to shared Supabase without separate authorization.

CREATE TABLE IF NOT EXISTS public.core_invocation_dispatches (
  dispatch_id uuid PRIMARY KEY,
  convocatoria_id uuid NOT NULL REFERENCES public.convocatorias_ronda(id) ON DELETE RESTRICT,
  investigador_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'claimed', 'expired', 'revoked')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  created_by uuid NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid,
  reconciliation_note text,
  CONSTRAINT core_invocation_dispatches_claim_shape_ck CHECK (
    (status = 'issued' AND claimed_at IS NULL AND revoked_at IS NULL AND revoked_by IS NULL AND reconciliation_note IS NULL)
    OR (status = 'claimed' AND claimed_at IS NOT NULL AND revoked_at IS NULL AND revoked_by IS NULL AND reconciliation_note IS NULL)
    OR (status = 'expired' AND claimed_at IS NULL AND revoked_at IS NULL AND revoked_by IS NULL AND reconciliation_note IS NULL)
    OR (status = 'revoked' AND claimed_at IS NOT NULL AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL
        AND reconciliation_note IS NOT NULL AND length(btrim(reconciliation_note)) BETWEEN 10 AND 500)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS core_invocation_dispatches_one_active_per_invocation_idx
  ON public.core_invocation_dispatches (convocatoria_id)
  WHERE status IN ('issued', 'claimed');

CREATE INDEX IF NOT EXISTS core_invocation_dispatches_expiry_idx
  ON public.core_invocation_dispatches (expires_at)
  WHERE status = 'issued';

ALTER TABLE public.core_invocation_dispatches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.core_invocation_dispatches FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.arkhe_issue_invocation_dispatch(
  p_dispatch_id uuid,
  p_convocatoria_id uuid,
  p_investigador_id uuid,
  p_actor_id uuid,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convocatoria public.convocatorias_ronda%ROWTYPE;
  v_dispatch public.core_invocation_dispatches%ROWTYPE;
BEGIN
  IF p_actor_id IS DISTINCT FROM '2a003935-f248-442c-96fc-dcee29c4d41a'::uuid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the authenticated human governor may issue dispatches';
  END IF;
  IF p_dispatch_id IS NULL OR p_convocatoria_id IS NULL OR p_investigador_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dispatch, convocation and investigator IDs are required';
  END IF;
  IF p_investigador_id NOT IN (
    '6deb143d-17c4-4d1a-a2d2-1fd9ddf2853f'::uuid,
    '122483a9-5012-46ce-a328-5bdb08b4de01'::uuid,
    '656726d1-8209-4240-8169-a7434074609d'::uuid
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Dispatch target is not an authorized Arkhé service investigator';
  END IF;
  IF p_expires_at IS NULL OR p_expires_at <= now() OR p_expires_at > now() + interval '2 minutes' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dispatch expiry must be in the next two minutes';
  END IF;

  SELECT *
    INTO v_convocatoria
    FROM public.convocatorias_ronda
   WHERE id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convocation not found';
  END IF;

  IF v_convocatoria.investigador_id IS DISTINCT FROM p_investigador_id
     OR v_convocatoria.convocada_por IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Convocation owner or investigator does not match the authorized dispatch';
  END IF;

  IF v_convocatoria.estado NOT IN ('enviada', 'pendiente') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Convocation state does not allow dispatch';
  END IF;

  -- Expired, never-claimed dispatches are reconciled as expired before a new
  -- manually authorized dispatch is issued. Claimed dispatches are terminal:
  -- never re-dispatch automatically after an ambiguous result.
  UPDATE public.core_invocation_dispatches
     SET status = 'expired'
   WHERE convocatoria_id = p_convocatoria_id
     AND status = 'issued'
     AND expires_at <= now();

  INSERT INTO public.core_invocation_dispatches (
    dispatch_id, convocatoria_id, investigador_id, status, expires_at, created_by
  ) VALUES (
    p_dispatch_id, p_convocatoria_id, p_investigador_id, 'issued', p_expires_at, p_actor_id
  )
  RETURNING * INTO v_dispatch;

  RETURN jsonb_build_object(
    'dispatch_id', v_dispatch.dispatch_id,
    'convocatoria_id', v_dispatch.convocatoria_id,
    'investigador_id', v_dispatch.investigador_id,
    'status', v_dispatch.status,
    'expires_at', v_dispatch.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.arkhe_claim_invocation_dispatch(
  p_dispatch_id uuid,
  p_convocatoria_id uuid,
  p_investigador_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispatch public.core_invocation_dispatches%ROWTYPE;
  v_convocatoria public.convocatorias_ronda%ROWTYPE;
BEGIN
  IF p_dispatch_id IS NULL OR p_convocatoria_id IS NULL OR p_investigador_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dispatch, convocation and investigator IDs are required';
  END IF;

  -- Keep the same lock order as issuance: invocation first, dispatch row second.
  -- This prevents a deadlock between an issuer expiring an old dispatch and a
  -- bot concurrently attempting to claim that same dispatch.
  SELECT *
    INTO v_convocatoria
    FROM public.convocatorias_ronda
   WHERE id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convocation not found';
  END IF;

  IF v_convocatoria.investigador_id IS DISTINCT FROM p_investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Convocation is not assigned to the authenticated investigator';
  END IF;

  IF v_convocatoria.estado NOT IN ('enviada', 'pendiente') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Convocation state does not allow dispatch claim';
  END IF;

  SELECT *
    INTO v_dispatch
    FROM public.core_invocation_dispatches
   WHERE dispatch_id = p_dispatch_id
     AND convocatoria_id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Signed dispatch not found';
  END IF;

  IF v_dispatch.investigador_id IS DISTINCT FROM p_investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Dispatch is not assigned to the authenticated investigator';
  END IF;

  IF v_dispatch.expires_at <= now() OR v_dispatch.status = 'expired' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Signed dispatch expired; do not retry automatically';
  END IF;

  IF v_dispatch.status <> 'issued' THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Signed dispatch has already been claimed or revoked; do not replay';
  END IF;

  UPDATE public.core_invocation_dispatches
     SET status = 'claimed',
         claimed_at = now()
   WHERE dispatch_id = p_dispatch_id
     AND status = 'issued'
  RETURNING * INTO v_dispatch;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Signed dispatch was concurrently claimed; do not replay';
  END IF;

  RETURN jsonb_build_object(
    'dispatch_id', v_dispatch.dispatch_id,
    'convocatoria_id', v_dispatch.convocatoria_id,
    'investigador_id', v_dispatch.investigador_id,
    'status', v_dispatch.status,
    'claimed_at', v_dispatch.claimed_at
  );
END;
$$;




CREATE OR REPLACE FUNCTION public.arkhe_validate_invocation_dispatch(
  p_dispatch_id uuid,
  p_convocatoria_id uuid,
  p_investigador_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dispatch_function$
DECLARE
  v_convocatoria public.convocatorias_ronda%ROWTYPE;
  v_dispatch public.core_invocation_dispatches%ROWTYPE;
BEGIN
  IF p_dispatch_id IS NULL OR p_convocatoria_id IS NULL OR p_investigador_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dispatch, convocation and investigator IDs are required';
  END IF;

  SELECT *
    INTO v_convocatoria
    FROM public.convocatorias_ronda
   WHERE id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convocation not found';
  END IF;
  IF v_convocatoria.investigador_id IS DISTINCT FROM p_investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Convocation is not assigned to the authenticated investigator';
  END IF;
  IF v_convocatoria.estado NOT IN ('enviada', 'pendiente') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Convocation is not available for processing';
  END IF;

  SELECT *
    INTO v_dispatch
    FROM public.core_invocation_dispatches
   WHERE dispatch_id = p_dispatch_id
     AND convocatoria_id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Signed dispatch not found';
  END IF;
  IF v_dispatch.investigador_id IS DISTINCT FROM p_investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Dispatch is not assigned to the authenticated investigator';
  END IF;
  IF v_dispatch.status <> 'claimed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Dispatch is no longer active; reconcile before processing';
  END IF;

  RETURN jsonb_build_object(
    'dispatch_id', v_dispatch.dispatch_id,
    'convocatoria_id', v_dispatch.convocatoria_id,
    'investigador_id', v_dispatch.investigador_id,
    'status', v_dispatch.status,
    'claimed_at', v_dispatch.claimed_at
  );
END;
$dispatch_function$;


CREATE OR REPLACE FUNCTION public.arkhe_fail_invocation_atomically(
  p_dispatch_id uuid,
  p_convocatoria_id uuid,
  p_investigador_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dispatch_function$
DECLARE
  v_convocatoria public.convocatorias_ronda%ROWTYPE;
  v_dispatch public.core_invocation_dispatches%ROWTYPE;
  v_updated public.convocatorias_ronda%ROWTYPE;
BEGIN
  IF p_dispatch_id IS NULL OR p_convocatoria_id IS NULL OR p_investigador_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dispatch, convocation and investigator IDs are required';
  END IF;

  -- Always lock invocation first, then dispatch, matching issue/claim/complete/reconcile.
  SELECT *
    INTO v_convocatoria
    FROM public.convocatorias_ronda
   WHERE id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convocation not found';
  END IF;
  IF v_convocatoria.investigador_id IS DISTINCT FROM p_investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Convocation is not assigned to the authenticated investigator';
  END IF;

  SELECT *
    INTO v_dispatch
    FROM public.core_invocation_dispatches
   WHERE dispatch_id = p_dispatch_id
     AND convocatoria_id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Signed dispatch not found';
  END IF;
  IF v_dispatch.investigador_id IS DISTINCT FROM p_investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Dispatch is not assigned to the authenticated investigator';
  END IF;
  IF v_dispatch.status <> 'claimed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Dispatch is no longer active; it cannot fail this invocation';
  END IF;

  IF v_convocatoria.estado = 'error' THEN
    RETURN jsonb_build_object('convocatoria', to_jsonb(v_convocatoria), 'idempotent_replay', true);
  END IF;
  IF v_convocatoria.estado = 'completada' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Completed invocation cannot be marked as failed';
  END IF;
  IF v_convocatoria.estado NOT IN ('enviada', 'pendiente') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Convocation state does not allow failure';
  END IF;

  UPDATE public.convocatorias_ronda
     SET estado = 'error',
         completed_at = now()
   WHERE id = p_convocatoria_id
     AND estado IN ('enviada', 'pendiente')
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Convocation state changed during failure transition';
  END IF;

  RETURN jsonb_build_object('convocatoria', to_jsonb(v_updated), 'idempotent_replay', false);
END;
$dispatch_function$;


CREATE OR REPLACE FUNCTION public.arkhe_reconcile_invocation_dispatch(
  p_dispatch_id uuid,
  p_convocatoria_id uuid,
  p_actor_id uuid,
  p_reconciliation_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dispatch_function$
DECLARE
  v_convocatoria public.convocatorias_ronda%ROWTYPE;
  v_dispatch public.core_invocation_dispatches%ROWTYPE;
  v_updated public.core_invocation_dispatches%ROWTYPE;
BEGIN
  IF p_actor_id IS DISTINCT FROM '2a003935-f248-442c-96fc-dcee29c4d41a'::uuid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the authenticated human governor may reconcile a dispatch';
  END IF;
  IF p_dispatch_id IS NULL OR p_convocatoria_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dispatch and convocation IDs are required';
  END IF;
  IF p_reconciliation_note IS NULL OR length(btrim(p_reconciliation_note)) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reconciliation note between 10 and 500 characters is required';
  END IF;

  SELECT *
    INTO v_convocatoria
    FROM public.convocatorias_ronda
   WHERE id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convocation not found';
  END IF;
  IF v_convocatoria.convocada_por IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the original human governor may reconcile this invocation';
  END IF;
  IF v_convocatoria.estado NOT IN ('enviada', 'pendiente') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Only a pending invocation may be reconciled';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.intervenciones_ronda
     WHERE metadata ->> 'convocatoria_id' = p_convocatoria_id::text
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'An intervention already exists; manual data reconciliation is required';
  END IF;

  SELECT *
    INTO v_dispatch
    FROM public.core_invocation_dispatches
   WHERE dispatch_id = p_dispatch_id
     AND convocatoria_id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Signed dispatch not found';
  END IF;
  IF v_dispatch.created_by IS DISTINCT FROM p_actor_id
     OR v_dispatch.investigador_id IS DISTINCT FROM v_convocatoria.investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Dispatch does not match the original human governor and assigned investigator';
  END IF;
  IF v_dispatch.status <> 'claimed' OR v_dispatch.claimed_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Only a previously claimed dispatch may be reconciled';
  END IF;
  IF v_dispatch.claimed_at > now() - interval '5 minutes' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Dispatch is too recent to reconcile; inspect runtime and wait at least five minutes';
  END IF;

  UPDATE public.core_invocation_dispatches
     SET status = 'revoked',
         revoked_at = now(),
         revoked_by = p_actor_id,
         reconciliation_note = btrim(p_reconciliation_note)
   WHERE dispatch_id = p_dispatch_id
     AND status = 'claimed'
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Dispatch status changed during reconciliation';
  END IF;

  RETURN jsonb_build_object(
    'dispatch_id', v_updated.dispatch_id,
    'convocatoria_id', v_updated.convocatoria_id,
    'status', v_updated.status,
    'revoked_at', v_updated.revoked_at,
    'revoked_by', v_updated.revoked_by,
    'reconciliation_note', v_updated.reconciliation_note
  );
END;
$dispatch_function$;

REVOKE ALL ON FUNCTION public.arkhe_issue_invocation_dispatch(uuid, uuid, uuid, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.arkhe_claim_invocation_dispatch(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.arkhe_validate_invocation_dispatch(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.arkhe_fail_invocation_atomically(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.arkhe_reconcile_invocation_dispatch(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.arkhe_issue_invocation_dispatch(uuid, uuid, uuid, uuid, timestamptz)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.arkhe_claim_invocation_dispatch(uuid, uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.arkhe_validate_invocation_dispatch(uuid, uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.arkhe_fail_invocation_atomically(uuid, uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.arkhe_reconcile_invocation_dispatch(uuid, uuid, uuid, text)
  TO service_role;
