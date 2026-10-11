-- Complete an investigator invocation and append its intervention atomically.
-- This migration is prepared for review only; do not apply to shared Supabase without separate approval.

DO $$
BEGIN
  IF EXISTS (
    SELECT metadata ->> 'convocatoria_id'
    FROM public.intervenciones_ronda
    WHERE COALESCE(metadata ->> 'convocatoria_id', '') <> ''
    GROUP BY metadata ->> 'convocatoria_id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate convocatoria_id references already exist in intervenciones_ronda; reconcile before adding the uniqueness index';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS intervenciones_ronda_convocatoria_id_unique_idx
  ON public.intervenciones_ronda ((metadata ->> 'convocatoria_id'))
  WHERE COALESCE(metadata ->> 'convocatoria_id', '') <> '';

CREATE OR REPLACE FUNCTION public.arkhe_complete_invocation_atomically(
  p_convocatoria_id uuid,
  p_dispatch_id uuid,
  p_ronda_id uuid,
  p_investigador_id uuid,
  p_tipo text,
  p_contenido text,
  p_responde_a_intervencion_id uuid,
  p_nodo_id bigint,
  p_metadata jsonb,
  p_fingerprint text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convocatoria public.convocatorias_ronda%ROWTYPE;
  v_dispatch public.core_invocation_dispatches%ROWTYPE;
  v_intervencion public.intervenciones_ronda%ROWTYPE;
  v_existente public.intervenciones_ronda%ROWTYPE;
  v_metadata jsonb;
  v_tiene_intervencion boolean := false;
BEGIN
  IF p_convocatoria_id IS NULL OR p_dispatch_id IS NULL OR p_ronda_id IS NULL OR p_investigador_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invocation, dispatch, round and investigator IDs are required';
  END IF;
  IF p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A SHA-256 completion fingerprint is required';
  END IF;
  IF p_tipo IS NULL OR length(btrim(p_tipo)) = 0 OR length(p_tipo) > 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid intervention type is required';
  END IF;
  IF p_contenido IS NULL OR length(btrim(p_contenido)) = 0 OR length(p_contenido) > 50000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Intervention content must contain between 1 and 50000 characters';
  END IF;
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Intervention metadata must be a JSON object';
  END IF;

  -- The row lock serializes duplicate completions for this invocation.
  SELECT *
    INTO v_convocatoria
    FROM public.convocatorias_ronda
   WHERE id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convocation not found';
  END IF;

  IF v_convocatoria.ronda_id IS DISTINCT FROM p_ronda_id
     OR v_convocatoria.investigador_id IS DISTINCT FROM p_investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Convocation ownership does not match the authenticated investigator';
  END IF;

  -- Every persisted intervention must be tied to the exact one-shot dispatch
  -- currently claimed by this investigator. This is what makes manual
  -- reconciliation safe: revoking an abandoned dispatch blocks late workers.
  SELECT *
    INTO v_dispatch
    FROM public.core_invocation_dispatches
   WHERE dispatch_id = p_dispatch_id
     AND convocatoria_id = p_convocatoria_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Signed dispatch not found for this invocation';
  END IF;

  IF v_dispatch.investigador_id IS DISTINCT FROM p_investigador_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Dispatch does not belong to the authenticated investigator';
  END IF;

  IF v_dispatch.status <> 'claimed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Dispatch is no longer active; reconcile before any new dispatch';
  END IF;

  SELECT *
    INTO v_existente
    FROM public.intervenciones_ronda
   WHERE metadata ->> 'convocatoria_id' = p_convocatoria_id::text
   LIMIT 1;
  v_tiene_intervencion := FOUND;

  IF v_convocatoria.estado = 'completada' THEN
    IF NOT v_tiene_intervencion THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Completed convocation has no matching intervention; manual reconciliation is required';
    END IF;

    IF v_existente.metadata ->> 'completion_fingerprint' IS DISTINCT FROM p_fingerprint THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Convocation was already completed with a different payload; do not retry automatically';
    END IF;

    RETURN jsonb_build_object(
      'intervencion', to_jsonb(v_existente),
      'convocatoria', to_jsonb(v_convocatoria),
      'idempotent_replay', true
    );
  END IF;

  IF v_convocatoria.estado NOT IN ('enviada', 'pendiente') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Convocation state does not allow completion; manual reconciliation may be required';
  END IF;

  IF v_tiene_intervencion THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'An intervention already references this convocation while it is not completed; manual reconciliation is required';
  END IF;

  v_metadata := p_metadata || jsonb_build_object(
    'convocatoria_id', p_convocatoria_id::text,
    'completion_fingerprint', p_fingerprint
  );

  v_intervencion := public.arkhe_insert_intervencion_ronda(
    p_ronda_id,
    p_investigador_id,
    p_tipo,
    btrim(p_contenido),
    p_responde_a_intervencion_id,
    p_nodo_id,
    v_metadata
  );

  UPDATE public.convocatorias_ronda
     SET estado = 'completada',
         completed_at = now()
   WHERE id = p_convocatoria_id
     AND estado IN ('enviada', 'pendiente')
  RETURNING * INTO v_convocatoria;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Convocation state changed during completion; retry only after reconciliation';
  END IF;

  RETURN jsonb_build_object(
    'intervencion', to_jsonb(v_intervencion),
    'convocatoria', to_jsonb(v_convocatoria),
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.arkhe_complete_invocation_atomically(
  uuid, uuid, uuid, uuid, text, text, uuid, bigint, jsonb, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.arkhe_complete_invocation_atomically(
  uuid, uuid, uuid, uuid, text, text, uuid, bigint, jsonb, text
) TO service_role;
