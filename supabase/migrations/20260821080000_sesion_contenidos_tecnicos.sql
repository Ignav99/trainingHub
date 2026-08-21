-- Etiquetas técnicas de sesión: TEXT[] (063) + JSONB legacy (055).
-- Idempotente: producción puede tener solo una de las dos.

ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS contenidos_tecnicos_of TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contenidos_tecnicos_def TEXT[] DEFAULT '{}';

ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS contenidos_ofensivos JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS contenidos_defensivos JSONB DEFAULT '[]'::JSONB;

NOTIFY pgrst, 'reload schema';
