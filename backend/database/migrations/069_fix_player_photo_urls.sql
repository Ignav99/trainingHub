-- Corrige foto_url guardadas con el bug de cache-busting anterior:
-- la URL quedaba como ".../avatar.png&v=169..." (sin "?") en vez de
-- ".../avatar.png?v=169...", lo que hacía que Supabase Storage devolviera
-- 400 Bad Request al servir la imagen. Ver player_photo_service.py::_cache_bust.

UPDATE jugadores
SET foto_url = regexp_replace(foto_url, '&(v=\d+)$', '?\1')
WHERE foto_url ~ '&v=\d+$'
  AND foto_url !~ '\?';
