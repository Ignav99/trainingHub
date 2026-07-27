-- ============================================================================
-- MIGRACIÓN 067: Desarrollo / reglas / anotaciones + familia madre→variantes
-- ============================================================================
-- Contenido narrativo simplificado:
--   desarrollo  = qué se hace en la tarea
--   reglas      = reglas / condicionantes / variantes de juego
--   anotaciones = tips, errores comunes (opcional)
--
-- Familia reutilizable:
--   tarea_origen_id = apunta a la tarea madre
--   tipo_variante   = progresion | regresion | adaptacion | contexto | reglas
-- ============================================================================

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS desarrollo TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS reglas TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS anotaciones TEXT;

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS tarea_origen_id UUID REFERENCES tareas(id) ON DELETE SET NULL;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS tipo_variante VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tareas_tipo_variante_check'
  ) THEN
    ALTER TABLE tareas
      ADD CONSTRAINT tareas_tipo_variante_check
      CHECK (
        tipo_variante IS NULL
        OR tipo_variante IN ('original', 'progresion', 'regresion', 'adaptacion', 'contexto', 'reglas')
      );
  END IF;
END $$;

COMMENT ON COLUMN tareas.desarrollo IS 'Qué se hace en la tarea (organización literal del ejercicio)';
COMMENT ON COLUMN tareas.reglas IS 'Reglas, condicionantes y variantes de juego de esta versión';
COMMENT ON COLUMN tareas.anotaciones IS 'Notas opcionales: errores comunes, tips de coaching';
COMMENT ON COLUMN tareas.tarea_origen_id IS 'Tarea madre de la que deriva esta variante (NULL = es madre/original)';
COMMENT ON COLUMN tareas.tipo_variante IS 'original | progresion | regresion | adaptacion | contexto | reglas';

CREATE INDEX IF NOT EXISTS idx_tareas_origen
  ON tareas (tarea_origen_id)
  WHERE tarea_origen_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tareas_madres
  ON tareas (organizacion_id)
  WHERE tarea_origen_id IS NULL;

-- Backfill: desarrollo desde descripcion si vacío
UPDATE tareas
SET desarrollo = descripcion
WHERE (desarrollo IS NULL OR desarrollo = '')
  AND descripcion IS NOT NULL
  AND descripcion <> '';

-- Backfill: reglas desde arrays legacy si vacío
UPDATE tareas
SET reglas = trim(both E'\n' FROM concat_ws(
  E'\n',
  NULLIF(array_to_string(COALESCE(reglas_tacticas, '{}'::text[]), E'\n'), ''),
  NULLIF(array_to_string(COALESCE(reglas_tecnicas, '{}'::text[]), E'\n'), ''),
  NULLIF(array_to_string(COALESCE(reglas_psicologicas, '{}'::text[]), E'\n'), '')
))
WHERE (reglas IS NULL OR reglas = '')
  AND (
    COALESCE(array_length(reglas_tacticas, 1), 0) > 0
    OR COALESCE(array_length(reglas_tecnicas, 1), 0) > 0
    OR COALESCE(array_length(reglas_psicologicas, 1), 0) > 0
  );

-- Backfill: anotaciones desde errores_comunes si vacío
UPDATE tareas
SET anotaciones = array_to_string(errores_comunes, E'\n')
WHERE (anotaciones IS NULL OR anotaciones = '')
  AND COALESCE(array_length(errores_comunes, 1), 0) > 0;

-- Madres: marcar tipo original cuando no tienen origen
UPDATE tareas
SET tipo_variante = 'original'
WHERE tarea_origen_id IS NULL
  AND (tipo_variante IS NULL OR tipo_variante = '');

-- Importante: refrescar el schema cache de PostgREST (si no, la API falla 500
-- al filtrar por columnas nuevas como tarea_origen_id).
NOTIFY pgrst, 'reload schema';
