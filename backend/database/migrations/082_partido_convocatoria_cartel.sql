-- Datos del cartel de convocatoria (citación + kit) en el partido.

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS hora_citacion TEXT,
  ADD COLUMN IF NOT EXISTS lugar_citacion TEXT,
  ADD COLUMN IF NOT EXISTS kit_convocatoria TEXT DEFAULT 'local';

ALTER TABLE partidos DROP CONSTRAINT IF EXISTS partidos_kit_convocatoria_check;
ALTER TABLE partidos
  ADD CONSTRAINT partidos_kit_convocatoria_check
  CHECK (kit_convocatoria IS NULL OR kit_convocatoria IN ('local', 'visitante'));
