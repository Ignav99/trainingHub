-- ============================================================================
-- SIATE: grado de oposición (GO) y ejecutantes simultáneos (PES)
-- Idempotente. Si PostgREST no ve las columnas: NOTIFY pgrst, 'reload schema';
-- El frontend también guarda GO/PES en grafico_data.siate (funciona sin esto).
-- ============================================================================

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS complejidad_go SMALLINT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS complejidad_pes SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tareas_complejidad_go_check'
  ) THEN
    ALTER TABLE tareas
      ADD CONSTRAINT tareas_complejidad_go_check
      CHECK (complejidad_go IS NULL OR (complejidad_go BETWEEN 1 AND 5));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tareas_complejidad_pes_check'
  ) THEN
    ALTER TABLE tareas
      ADD CONSTRAINT tareas_complejidad_pes_check
      CHECK (complejidad_pes IS NULL OR (complejidad_pes BETWEEN 1 AND 5));
  END IF;
END $$;

COMMENT ON COLUMN tareas.complejidad_go IS 'SIATE GO 1–5 (grado de oposición). También en grafico_data.siate.go';
COMMENT ON COLUMN tareas.complejidad_pes IS 'SIATE PES 1–5 (ejecutantes simultáneos). También en grafico_data.siate.pes';

NOTIFY pgrst, 'reload schema';
