-- ============================================================
-- 054: Campos del formulario "Crea tu ejercicio"
--
-- El formulario a pantalla completa (ver docs/mejoras/crear_tarea.png) pide
-- tres datos que no existian como columna:
--   complejidad → regla que aumenta la exigencia cognitiva de la tarea
--   dificultad  → escala 1-5 (los puntitos de la biblioteca)
--   exigencia   → escala 1-5 (carga percibida)
--
-- "Competitividad" NO se anade: es exactamente `forma_puntuar`, que ya existe
-- (como se gana / como se puntua la tarea). El formulario la etiqueta asi.
-- ============================================================

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS complejidad TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS dificultad SMALLINT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS exigencia SMALLINT;

-- Rangos 1-5 (se anaden sin validar filas existentes: todas son NULL al crear la columna)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tareas_dificultad_rango'
    ) THEN
        ALTER TABLE tareas
            ADD CONSTRAINT tareas_dificultad_rango
            CHECK (dificultad IS NULL OR dificultad BETWEEN 1 AND 5);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tareas_exigencia_rango'
    ) THEN
        ALTER TABLE tareas
            ADD CONSTRAINT tareas_exigencia_rango
            CHECK (exigencia IS NULL OR exigencia BETWEEN 1 AND 5);
    END IF;
END $$;

COMMENT ON COLUMN tareas.complejidad IS 'Regla que aumenta la exigencia cognitiva (ej. "Limitar a 1-2 toques")';
COMMENT ON COLUMN tareas.dificultad IS 'Escala 1-5 de dificultad tecnico-tactica';
COMMENT ON COLUMN tareas.exigencia IS 'Escala 1-5 de exigencia fisica percibida';
