-- Rendimiento colaborativo por convocatoria + reflexión del entrenador en informe
-- Aplicar manualmente en Supabase si el deploy no ejecuta migraciones.

-- Notas de rendimiento: cada CT puede puntuar (1-10); se promedia
CREATE TABLE IF NOT EXISTS rendimiento_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convocatoria_id UUID NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
  evaluador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nota NUMERIC(3,1) NOT NULL CHECK (nota >= 1 AND nota <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (convocatoria_id, evaluador_id)
);

CREATE INDEX IF NOT EXISTS idx_rendimiento_notas_convocatoria
  ON rendimiento_notas (convocatoria_id);

CREATE INDEX IF NOT EXISTS idx_rendimiento_notas_evaluador
  ON rendimiento_notas (evaluador_id);

-- Cache de media en convocatoria (agregación rápida en ficha jugador)
ALTER TABLE convocatorias
  ADD COLUMN IF NOT EXISTS rendimiento_media NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS rendimiento_num_notas INT NOT NULL DEFAULT 0;

-- Reflexión del 1er/2º entrenador (mejora) → visible en Sala del Lunes del siguiente microciclo
ALTER TABLE estadisticas_partido
  ADD COLUMN IF NOT EXISTS reflexion_entrenador TEXT NOT NULL DEFAULT '';
