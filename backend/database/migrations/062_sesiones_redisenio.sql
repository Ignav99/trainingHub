-- 062_sesiones_redisenio.sql
-- Rediseño de sesiones: columnas de contexto + fases extendidas + orden en microciclo
-- Aplicar manualmente en Supabase SQL Editor.

-- Hora / lugar (usados por FE y modelos; a menudo faltaban en prod)
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS hora TIME,
  ADD COLUMN IF NOT EXISTS lugar TEXT;

-- Posición dentro del microciclo (Sala del Lunes)
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS dia_numero INT,
  ADD COLUMN IF NOT EXISTS orden INT DEFAULT 0;

-- Ampliar CHECK de fase_sesion a desarrollo_3..6
DO $$
BEGIN
  -- Drop any existing check constraint on fase_sesion (name varies by migration history)
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'sesion_tareas' AND column_name = 'fase_sesion'
  ) THEN
    ALTER TABLE sesion_tareas DROP CONSTRAINT IF EXISTS sesion_tareas_fase_sesion_check;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignore if constraint name differs
  NULL;
END $$;

ALTER TABLE sesion_tareas DROP CONSTRAINT IF EXISTS sesion_tareas_fase_sesion_check;

ALTER TABLE sesion_tareas
  ADD CONSTRAINT sesion_tareas_fase_sesion_check
  CHECK (fase_sesion IN (
    'activacion',
    'desarrollo_1',
    'desarrollo_2',
    'desarrollo_3',
    'desarrollo_4',
    'desarrollo_5',
    'desarrollo_6',
    'vuelta_calma'
  ));

-- Índice útil para listados por microciclo/día
CREATE INDEX IF NOT EXISTS idx_sesiones_microciclo_dia
  ON sesiones (microciclo_id, dia_numero, orden)
  WHERE microciclo_id IS NOT NULL;

COMMENT ON COLUMN sesiones.hora IS 'Hora de inicio de la sesión (HH:MM)';
COMMENT ON COLUMN sesiones.lugar IS 'Lugar de entrenamiento';
COMMENT ON COLUMN sesiones.dia_numero IS 'Día dentro del microciclo (1..N)';
COMMENT ON COLUMN sesiones.orden IS 'Orden dentro del día en Sala del Lunes';
