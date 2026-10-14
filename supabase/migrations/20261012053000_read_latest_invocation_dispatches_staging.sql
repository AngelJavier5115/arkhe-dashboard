-- STAGING ONLY: guarded read-only RPC for persisted dispatch state.
DO $a4_staging_guard$
DECLARE sentinel_count integer;
BEGIN
  SELECT count(*) INTO sentinel_count
  FROM public.investigaciones_proyecto
  WHERE id = 'a4400000-0000-4000-8000-000000000001'::uuid
    AND codigo = 'A4-STAGE-001'
    AND titulo = 'Prueba técnica A.4 (staging)';
  IF sentinel_count <> 1 THEN
    RAISE EXCEPTION 'STAGING ONLY: A4-STAGE-001 sentinel missing; refusing to apply.';
  END IF;
END
$a4_staging_guard$;

CREATE OR REPLACE FUNCTION public.arkhe_get_latest_invocation_dispatches(
  p_convocatoria_ids uuid[]
)
RETURNS TABLE (
  dispatch_id uuid,
  convocatoria_id uuid,
  status text,
  issued_at timestamptz,
  expires_at timestamptz,
  claimed_at timestamptz,
  revoked_at timestamptz,
  reconciliation_note text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_convocatoria_ids IS NULL OR cardinality(p_convocatoria_ids) = 0 OR cardinality(p_convocatoria_ids) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Between 1 and 100 convocation IDs are required';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (d.convocatoria_id)
         d.dispatch_id,
         d.convocatoria_id,
         d.status,
         d.issued_at,
         d.expires_at,
         d.claimed_at,
         d.revoked_at,
         d.reconciliation_note
    FROM public.core_invocation_dispatches d
    JOIN public.convocatorias_ronda c ON c.id = d.convocatoria_id
    JOIN public.rondas_investigacion r ON r.id = c.ronda_id
    JOIN public.investigaciones_proyecto ip ON ip.id = r.investigacion_id
   WHERE d.convocatoria_id = ANY(p_convocatoria_ids)
     AND ip.codigo = 'A4-STAGE-001'
   ORDER BY d.convocatoria_id, d.issued_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.arkhe_get_latest_invocation_dispatches(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arkhe_get_latest_invocation_dispatches(uuid[]) TO service_role;
