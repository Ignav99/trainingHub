-- 085: cargas profesionales — compensatorio, tiempo efectivo, RPE sesión/partido
-- Aplicar en Supabase SQL Editor si no corre el pipeline de migraciones.

-- 1) Tareas de sesión: minutos efectivos (trabajo real) independientes del reloj
ALTER TABLE sesion_tareas
  ADD COLUMN IF NOT EXISTS minutos_efectivos INTEGER;

COMMENT ON COLUMN sesion_tareas.minutos_efectivos IS
  'Minutos de trabajo para carga (override). NULL = duracion_reloj - descanso de la ficha.';

-- 2) Fases compensatorio_1..3 (tres lanes paralelos dentro de un bloque)
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
    'vuelta_calma',
    'compensatorio_1',
    'compensatorio_2',
    'compensatorio_3'
  ));

-- 3) RPE de partido en convocatoria (columna de la tabla de rendimiento)
ALTER TABLE convocatorias
  ADD COLUMN IF NOT EXISTS rpe INTEGER;

ALTER TABLE convocatorias DROP CONSTRAINT IF EXISTS convocatorias_rpe_check;
ALTER TABLE convocatorias
  ADD CONSTRAINT convocatorias_rpe_check
  CHECK (rpe IS NULL OR (rpe BETWEEN 1 AND 10));

COMMENT ON COLUMN convocatorias.rpe IS
  'RPE 1-10 post-partido. Alimenta registros_rpe.tipo=partido y load_partido.';

-- 4) registros_rpe ligado a partido (Foster: RPE × minutos)
ALTER TABLE registros_rpe
  ADD COLUMN IF NOT EXISTS partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_registros_rpe_partido
  ON registros_rpe(partido_id)
  WHERE partido_id IS NOT NULL;

-- Un RPE de sesión por jugador (upsert desde Asignar RPE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_registros_rpe_jugador_sesion
  ON registros_rpe(jugador_id, sesion_id)
  WHERE sesion_id IS NOT NULL AND COALESCE(tipo, 'sesion') = 'sesion';

CREATE UNIQUE INDEX IF NOT EXISTS idx_registros_rpe_jugador_partido
  ON registros_rpe(jugador_id, partido_id)
  WHERE partido_id IS NOT NULL AND COALESCE(tipo, 'sesion') = 'partido';
