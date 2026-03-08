-- 028: Add tipo_participacion to asistencias_sesion
-- Allows tracking participation type: sesion (group), fisio (rehab), margen (individual aside)
-- Array because a player can do multiple: e.g. ['fisio', 'sesion']

ALTER TABLE asistencias_sesion
  ADD COLUMN IF NOT EXISTS tipo_participacion TEXT[] DEFAULT '{}';
