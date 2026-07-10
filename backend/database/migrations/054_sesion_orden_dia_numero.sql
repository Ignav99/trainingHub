-- FASE 4 fix: columnas de ordenación de sesiones dentro de un microciclo
ALTER TABLE sesiones
ADD COLUMN IF NOT EXISTS dia_numero INTEGER,
ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sesiones_microciclo_dia_orden ON sesiones(microciclo_id, dia_numero, orden);
