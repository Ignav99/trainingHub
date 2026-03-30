-- 041: Enable Row Level Security on core tables
-- Backend uses service_role_key which bypasses RLS automatically.
-- This blocks direct access via anon/authenticated keys (e.g. if someone extracts the anon key).

-- ============ Helper function ============
-- Returns the organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF uuid AS $$
  SELECT DISTINCT o.id
  FROM usuarios u
  JOIN organizaciones o ON u.organizacion_id = o.id
  WHERE u.id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the team IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.user_team_ids()
RETURNS SETOF uuid AS $$
  SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============ jugadores ============
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_teams" ON jugadores FOR ALL USING (
  equipo_id IN (SELECT public.user_team_ids())
);

-- ============ sesiones ============
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_teams" ON sesiones FOR ALL USING (
  equipo_id IN (SELECT public.user_team_ids())
);

-- ============ tareas ============
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_teams" ON tareas FOR ALL USING (
  equipo_id IN (SELECT public.user_team_ids())
);

-- ============ sesion_tareas ============
ALTER TABLE sesion_tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_teams" ON sesion_tareas FOR ALL USING (
  sesion_id IN (
    SELECT id FROM sesiones WHERE equipo_id IN (SELECT public.user_team_ids())
  )
);

-- ============ partidos ============
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_teams" ON partidos FOR ALL USING (
  equipo_id IN (SELECT public.user_team_ids())
);

-- ============ usuarios ============
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_org" ON usuarios FOR ALL USING (
  organizacion_id IN (SELECT public.user_org_ids())
  OR id = auth.uid()
);

-- ============ usuarios_equipos ============
ALTER TABLE usuarios_equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_teams" ON usuarios_equipos FOR ALL USING (
  equipo_id IN (SELECT public.user_team_ids())
  OR usuario_id = auth.uid()
);

-- ============ organizaciones ============
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_org" ON organizaciones FOR ALL USING (
  id IN (SELECT public.user_org_ids())
);

-- ============ equipos ============
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_org" ON equipos FOR ALL USING (
  organizacion_id IN (SELECT public.user_org_ids())
);

-- ============ consentimientos_gdpr ============
ALTER TABLE consentimientos_gdpr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON consentimientos_gdpr FOR ALL USING (
  usuario_id = auth.uid()
);

-- ============ solicitudes_gdpr ============
ALTER TABLE solicitudes_gdpr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON solicitudes_gdpr FOR ALL USING (
  usuario_id = auth.uid()
);

-- ============ suscripciones ============
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_org" ON suscripciones FOR ALL USING (
  organizacion_id IN (SELECT public.user_org_ids())
);

-- ============ audit_log ============
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_org" ON audit_log FOR ALL USING (
  organizacion_id IN (SELECT public.user_org_ids())
  OR usuario_id = auth.uid()::text
);

-- ============ documentos_kb ============
ALTER TABLE documentos_kb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_org" ON documentos_kb FOR ALL USING (
  organizacion_id IN (SELECT public.user_org_ids())
);
