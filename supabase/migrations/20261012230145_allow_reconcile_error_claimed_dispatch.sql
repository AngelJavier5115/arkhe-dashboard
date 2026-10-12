-- A.4 Staging: permit human revocation of a claimed dispatch when its
-- invocation already entered error after the worker reported a terminal failure.
-- Preserve the original human/staging guard, row-lock order, five-minute wait,
-- no-intervention invariant, and server-only RPC grants. This does not reset the
-- invocation state and never marks it completed.

CREATE OR REPLACE FUNCTION public.arkhe_reconcile_invocation_dispatch(
  p_dispatch_id uuid,
  p_convocatoria_id uuid,
  p_actor_id uuid,
  p_reconciliation_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Lock invocation first, then dispatch, consistently with issue/claim/complete.
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

  IF NOT EXISTS (
    SELECT 1
      FROM public.rondas_investigacion r
      JOIN public.investigaciones_proyecto ip ON ip.id = r.investigacion_id
     WHERE r.id = v_convocatoria.ronda_id
       AND ip.codigo = 'A4-STAGE-001'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Staging reconciliation is limited to A4-STAGE-001';
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

  -- Never reconcile if any intervention is associated with this invocation or dispatch.
  IF EXISTS (
    SELECT 1
      FROM public.intervenciones_ronda
     WHERE metadata ->> 'convocatoria_id' = p_convocatoria_id::text
        OR metadata ->> 'dispatch_id' = p_dispatch_id::text
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'An intervention already exists; manual data reconciliation is required';
  END IF;

  -- Case A: never-claimed and expired. This still requires a pending invocation;
  -- an invocation in error is not silently reclassified as an expiry.
  IF v_dispatch.status IN ('issued', 'expired')
     AND v_dispatch.claimed_at IS NULL
     AND v_dispatch.expires_at <= now()
     AND v_dispatch.reconciliation_note IS NULL THEN
    IF v_convocatoria.estado NOT IN ('enviada', 'pendiente') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Only a pending invocation with an unclaimed expired dispatch can be marked expired';
    END IF;
    IF v_dispatch.issued_at > now() - interval '5 minutes' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Expired unclaimed dispatch is too recent to reconcile; inspect runtime and wait at least five minutes';
    END IF;

    UPDATE public.core_invocation_dispatches
       SET status = 'expired',
           reconciliation_note = btrim(p_reconciliation_note)
     WHERE dispatch_id = p_dispatch_id
       AND convocatoria_id = p_convocatoria_id
       AND status IN ('issued', 'expired')
       AND claimed_at IS NULL
       AND expires_at <= now()
       AND reconciliation_note IS NULL
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Dispatch status changed during expired-dispatch reconciliation';
    END IF;

    RETURN jsonb_build_object(
      'dispatch_id', v_updated.dispatch_id,
      'convocatoria_id', v_updated.convocatoria_id,
      'status', 'expired',
      'claimed_at', v_updated.claimed_at,
      'reconciliation_note', v_updated.reconciliation_note
    );
  END IF;

  -- Case B: claimed dispatch. A terminal worker failure may already have changed
  -- the invocation to error. In that case, only revoke this dispatch; keep the
  -- invocation in error and never convert it to completed or resend it.
  IF v_dispatch.status = 'claimed' AND v_dispatch.claimed_at IS NOT NULL THEN
    IF v_convocatoria.estado NOT IN ('enviada', 'pendiente', 'error') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Only an active or failed invocation can have a claimed dispatch revoked';
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
       AND convocatoria_id = p_convocatoria_id
       AND status = 'claimed'
       AND claimed_at IS NOT NULL
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Dispatch status changed during reconciliation';
    END IF;

    RETURN jsonb_build_object(
      'dispatch_id', v_updated.dispatch_id,
      'convocatoria_id', v_updated.convocatoria_id,
      'status', 'revoked',
      'revoked_at', v_updated.revoked_at,
      'revoked_by', v_updated.revoked_by,
      'reconciliation_note', v_updated.reconciliation_note
    );
  END IF;

  RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Only a previously claimed dispatch or an expired unclaimed dispatch can be reconciled';
END;
$function$;

REVOKE ALL ON FUNCTION public.arkhe_reconcile_invocation_dispatch(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arkhe_reconcile_invocation_dispatch(uuid, uuid, uuid, text) TO service_role;
