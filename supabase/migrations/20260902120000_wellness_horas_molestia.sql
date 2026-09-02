-- Espejo de backend/database/migrations/078_wellness_horas_molestia.sql
-- 078: Wellness extra fields from the daily Google Form (horas de sueño + molestia).
ALTER TABLE registros_rpe
  ADD COLUMN IF NOT EXISTS horas_sueno NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS molestia BOOLEAN,
  ADD COLUMN IF NOT EXISTS molestia_texto TEXT;

COMMENT ON COLUMN registros_rpe.horas_sueno IS
  'Horas de sueño de la noche previa (formulario wellness).';
COMMENT ON COLUMN registros_rpe.molestia IS
  'Si el jugador reportó molestia en el wellness del día.';
COMMENT ON COLUMN registros_rpe.molestia_texto IS
  'Dónde y de qué tipo, si molestia es true.';
