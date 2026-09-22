-- 086: completar 085 si el índice único falló por RPE duplicados.
-- Idempotente. Pegar entero en Supabase SQL Editor.

-- Columnas (por si 085 no llegó a crearlas)
ALTER TABLE sesion_tareas
  ADD COLUMN IF NOT EXISTS minutos_efectivos INTEGER;

ALTER TABLE convocatorias
  ADD COLUMN IF NOT EXISTS rpe INTEGER;

ALTER TABLE convocatorias DROP CONSTRAINT IF EXISTS convocatorias_rpe_check;
ALTER TABLE convocatorias
  ADD CONSTRAINT convocatorias_rpe_check
  CHECK (rpe IS NULL OR (rpe BETWEEN 1 AND 10));

ALTER TABLE registros_rpe
  ADD COLUMN IF NOT EXISTS partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_registros_rpe_partido
  ON registros_rpe(partido_id)
  WHERE partido_id IS NOT NULL;

-- CHECK de fases compensatorio
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

-- Conservar el RPE más reciente (con valor) y borrar el resto
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_registros_rpe_jugador_sesion
  ON registros_rpe(jugador_id, sesion_id)
  WHERE sesion_id IS NOT NULL AND COALESCE(tipo, 'sesion') = 'sesion';

CREATE UNIQUE INDEX IF NOT EXISTS idx_registros_rpe_jugador_partido
  ON registros_rpe(jugador_id, partido_id)
  WHERE partido_id IS NOT NULL AND COALESCE(tipo, 'sesion') = 'partido';
