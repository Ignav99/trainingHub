-- Migration 091: permitir tipo='local_session' en videos_partido.
-- POST /videos/local-session (app/api/v1/videos.py) inserta tipo='local_session',
-- pero el CHECK original sólo admite veo | enlace_externo | upload.

ALTER TABLE videos_partido DROP CONSTRAINT IF EXISTS videos_partido_tipo_check;
ALTER TABLE videos_partido ADD CONSTRAINT videos_partido_tipo_check
  CHECK (tipo IN ('veo', 'enlace_externo', 'upload', 'local_session'));
