-- Bloques de sesión definidos por el usuario (activación, desarrollo, vuelta a la calma, videoanálisis, etc.)
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS estructura_fases JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN sesiones.estructura_fases IS
  'Lista ordenada de bloques de la sesión: { id, tipo, label, duracion_objetivo?, notas?, orden }';
