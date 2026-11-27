-- Comentarios anclados: un hilo del tablero puede quedar fijado en un punto
-- de una página (ruta + elemento + posición relativa). Aditiva y opcional:
-- sin esta columna la app sigue funcionando y oculta los comentarios anclados.
ALTER TABLE staff_posts ADD COLUMN IF NOT EXISTS ancla JSONB;

CREATE INDEX IF NOT EXISTS idx_staff_posts_ruta
    ON staff_posts ((ancla->>'ruta')) WHERE ancla IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_posts_path
    ON staff_posts (equipo_id, (ancla->>'path')) WHERE ancla IS NOT NULL;
