-- DEV SETUP 05: permitir tipo='local_session' en videos_partido
-- POST /videos/local-session (backend/app/api/v1/videos.py) inserta tipo='local_session',
-- pero el CHECK original sólo admite veo | enlace_externo | upload, así que la
-- inserción falla (el frontend ignora el error y sigue sin videoId).
-- Mismo contenido que backend/database/migrations/091_videos_partido_tipo_local_session.sql.

alter table public.videos_partido drop constraint if exists videos_partido_tipo_check;
alter table public.videos_partido add constraint videos_partido_tipo_check
  check (tipo in ('veo', 'enlace_externo', 'upload', 'local_session'));
