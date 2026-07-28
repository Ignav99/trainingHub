-- Player photos: bucket público con límite y MIME acotados.
-- La columna jugadores.foto_url ya existe desde 001_jugadores.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura pública (avatares en UI)
DROP POLICY IF EXISTS "player_photos_public_read" ON storage.objects;
CREATE POLICY "player_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-photos');

-- Escritura solo autenticados (el backend usa service role; esto cubre edge cases)
DROP POLICY IF EXISTS "player_photos_auth_write" ON storage.objects;
CREATE POLICY "player_photos_auth_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'player-photos');

DROP POLICY IF EXISTS "player_photos_auth_update" ON storage.objects;
CREATE POLICY "player_photos_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'player-photos')
  WITH CHECK (bucket_id = 'player-photos');

DROP POLICY IF EXISTS "player_photos_auth_delete" ON storage.objects;
CREATE POLICY "player_photos_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'player-photos');
