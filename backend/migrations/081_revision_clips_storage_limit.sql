-- Recortes de revisión: el bucket nace con el default de Storage (50MB).
-- La app admite 200MB; 87MB ya devolvía 413 EntityTooLarge.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'revision-clips',
  'revision-clips',
  true,
  209715200,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = GREATEST(COALESCE(storage.buckets.file_size_limit, 0), 209715200);
