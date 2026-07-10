-- FASE 4: Vinculación sesión ↔ plan de partido
ALTER TABLE sesiones
ADD COLUMN IF NOT EXISTS plan_partido_id UUID REFERENCES planes_partido(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fase_plan TEXT;

CREATE INDEX IF NOT EXISTS idx_sesiones_plan_partido_id ON sesiones(plan_partido_id);
