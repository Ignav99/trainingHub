-- ============================================================================
-- Desarrollo / reglas / anotaciones + familia madre→variantes
-- Idempotente. Si PostgREST no ve las columnas: NOTIFY pgrst, 'reload schema';
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

UPDATE tareas
SET desarrollo = descripcion
WHERE (desarrollo IS NULL OR desarrollo = '')
  AND descripcion IS NOT NULL
  AND descripcion <> '';

UPDATE tareas
SET tipo_variante = 'original'
WHERE tarea_origen_id IS NULL
  AND (tipo_variante IS NULL OR tipo_variante = '');

NOTIFY pgrst, 'reload schema';
