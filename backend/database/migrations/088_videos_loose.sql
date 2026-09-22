-- 088 videos_partido: sesiones locales sin partido (entrenamiento / vídeo suelto)
ALTER TABLE videos_partido
  ALTER COLUMN partido_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_partido_loose_fingerprint
  ON videos_partido (equipo_id, local_file_fingerprint)
  WHERE tipo = 'local_session'
    AND partido_id IS NULL
    AND local_file_fingerprint IS NOT NULL;
