-- ============================================================
-- Migration 043: Sala del Lunes — plan_ct column
-- Adds plan_ct (Plan del Cuerpo Técnico) JSONB to microciclos.
-- Stores the Monday room planning: rival scouting, game plan,
-- probable lineup, morfociclo daily planning (Frade/Seirul·lo).
-- ============================================================

ALTER TABLE microciclos
ADD COLUMN IF NOT EXISTS plan_ct JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN microciclos.plan_ct IS
  'CT planning for the week (Sala del Lunes): rival_scout, plan_partido, once_probable, dias (morfociclo structure per Frade/Seirulo).';
