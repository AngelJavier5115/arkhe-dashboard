-- STAGING ONLY: RLS lockdown for the isolated A.4 project.
-- Guard prevents accidental application to the shared/production database.
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

-- Enable row-level security on every application table in this isolated project.
ALTER TABLE public.investigadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas_arkhe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigaciones_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fases_investigacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigacion_nodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rondas_investigacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervenciones_ronda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocatorias_ronda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_investigadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorias_investigador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arkhe_human_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arkhe_webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arkhe_human_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arkhe_semantic_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arkhe_semantic_relation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arkhe_semantic_write_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_invocation_dispatches ENABLE ROW LEVEL SECURITY;

-- Remove broad browser-role table privileges everywhere. The server-side service_role
-- grants are intentionally untouched; it has BYPASSRLS and is used only by server APIs.
REVOKE ALL PRIVILEGES ON TABLE
  public.investigadores,
  public.areas_arkhe,
  public.investigaciones_proyecto,
  public.participaciones,
  public.fases_investigacion,
  public.investigaciones,
  public.investigacion_nodos,
  public.rondas_investigacion,
  public.intervenciones_ronda,
  public.convocatorias_ronda,
  public.perfiles_investigadores,
  public.memorias_investigador,
  public.arkhe_human_credentials,
  public.arkhe_webauthn_challenges,
  public.arkhe_human_sessions,
  public.ideas,
  public.tareas,
  public.arkhe_semantic_relations,
  public.arkhe_semantic_relation_events,
  public.arkhe_semantic_write_windows,
  public.core_invocation_dispatches
FROM anon, authenticated;

-- The browser needs SELECT for these Dashboard panels only. No browser writes are granted.
GRANT SELECT ON TABLE
  public.investigadores,
  public.areas_arkhe,
  public.investigaciones_proyecto,
  public.investigaciones,
  public.rondas_investigacion,
  public.ideas,
  public.tareas,
  public.arkhe_semantic_relations,
  public.arkhe_semantic_relation_events
TO anon, authenticated;

-- Public-facing Dashboard data in this database is synthetic staging data only.
-- These read policies preserve the existing Dashboard's read-only queries.
DROP POLICY IF EXISTS a4_staging_dashboard_read_only ON public.investigadores;
CREATE POLICY a4_staging_dashboard_read_only ON public.investigadores
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS a4_staging_dashboard_read_only ON public.areas_arkhe;
CREATE POLICY a4_staging_dashboard_read_only ON public.areas_arkhe
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS a4_staging_dashboard_read_only ON public.investigaciones_proyecto;
CREATE POLICY a4_staging_dashboard_read_only ON public.investigaciones_proyecto
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS a4_staging_dashboard_read_only ON public.investigaciones;
CREATE POLICY a4_staging_dashboard_read_only ON public.investigaciones
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS a4_staging_dashboard_read_only ON public.rondas_investigacion;
CREATE POLICY a4_staging_dashboard_read_only ON public.rondas_investigacion
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS a4_staging_dashboard_read_only ON public.ideas;
CREATE POLICY a4_staging_dashboard_read_only ON public.ideas
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS a4_staging_dashboard_read_only ON public.tareas;
CREATE POLICY a4_staging_dashboard_read_only ON public.tareas
  FOR SELECT TO anon, authenticated USING (true);

-- Keep explicit read-only policies for semantic relations/events.
DROP POLICY IF EXISTS arkhe_semantic_relations_read ON public.arkhe_semantic_relations;
CREATE POLICY arkhe_semantic_relations_read ON public.arkhe_semantic_relations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS arkhe_semantic_relation_events_read ON public.arkhe_semantic_relation_events;
CREATE POLICY arkhe_semantic_relation_events_read ON public.arkhe_semantic_relation_events
  FOR SELECT TO anon, authenticated USING (true);

-- Also remove browser-role access to sequences (service_role retains its privileges).
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
