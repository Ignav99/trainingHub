-- Migration 092: análisis de vídeo guardados (herramienta de vídeo).
-- Un análisis = botonera (buttons) + recortes (events) de un vídeo local, guardado
-- con nombre como las pizarras tácticas. El vídeo no se sube: se identifica por
-- video_fingerprint (nombre|tamaño|duración) y el usuario lo vuelve a cargar.

CREATE TABLE IF NOT EXISTS video_analisis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id uuid NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  descripcion text,
  video_filename text,
  video_fingerprint text,
  video_duration_ms integer,
  buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_analisis_equipo ON video_analisis (equipo_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_analisis_created_by ON video_analisis (created_by);

ALTER TABLE video_analisis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_full_access ON video_analisis;
CREATE POLICY service_role_full_access ON video_analisis
  TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE video_analisis TO service_role;
