-- 085: cargas profesionales — compensatorio, tiempo efectivo, RPE sesión/partido
-- Idempotente. Si 085 falló a mitad (índice único), vuelve a ejecutar este archivo
-- o aplica 086_cargas_rpe_unique_dedupe.sql.

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

-- 5) Dedupe ANTES de índices únicos (histórico: varios RPE por jugador+sesión)
DELETE FROM registros_rpe r
WHERE r.sesion_id IS NOT NULL
  AND COALESCE(r.tipo, 'sesion') = 'sesion'
  AND r.id NOT IN (
    SELECT kept.id
    FROM (
      SELECT DISTINCT ON (jugador_id, sesion_id) id
      FROM registros_rpe
      WHERE sesion_id IS NOT NULL
        AND COALESCE(tipo, 'sesion') = 'sesion'
      ORDER BY
        jugador_id,
        sesion_id,
        (rpe IS NOT NULL) DESC,
        created_at DESC NULLS LAST,
        id DESC
    ) kept
  );

DELETE FROM registros_rpe r
WHERE r.partido_id IS NOT NULL
  AND COALESCE(r.tipo, 'sesion') = 'partido'
  AND r.id NOT IN (
    SELECT kept.id
    FROM (
      SELECT DISTINCT ON (jugador_id, partido_id) id
      FROM registros_rpe
      WHERE partido_id IS NOT NULL
        AND COALESCE(tipo, 'sesion') = 'partido'
      ORDER BY
        jugador_id,
        partido_id,
        (rpe IS NOT NULL) DESC,
        created_at DESC NULLS LAST,
        id DESC
    ) kept
  );

-- 6) Un RPE de sesión/partido por jugador
CREATE UNIQUE INDEX IF NOT EXISTS idx_registros_rpe_jugador_sesion
  ON registros_rpe(jugador_id, sesion_id)
  WHERE sesion_id IS NOT NULL AND COALESCE(tipo, 'sesion') = 'sesion';

CREATE UNIQUE INDEX IF NOT EXISTS idx_registros_rpe_jugador_partido
  ON registros_rpe(jugador_id, partido_id)
  WHERE partido_id IS NOT NULL AND COALESCE(tipo, 'sesion') = 'partido';
