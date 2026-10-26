-- Biblioteca de cortes: recortes que se quedan en Cloudflare.
-- La revisión de la charla sigue borrándose a los 30 días.
-- Estos cortes no tienen caducidad ni límite de espacio.

CREATE TABLE IF NOT EXISTS biblioteca_cortes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL,
    partido_etiqueta TEXT,
    minuto_inicio INTEGER,
    minuto_fin INTEGER,
    fase TEXT,
    subfase TEXT,
    url TEXT,
    storage_path TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    duration_ms INTEGER,
    source_video_id UUID REFERENCES videos_partido(id) ON DELETE SET NULL,
    start_ms INTEGER,
    end_ms INTEGER,
    origen TEXT NOT NULL DEFAULT 'video' CHECK (origen IN ('video', 'revision', 'manual')),
    revision_clip_id UUID REFERENCES revision_clips(id) ON DELETE SET NULL,
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE biblioteca_cortes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON biblioteca_cortes;
CREATE POLICY "service_role_full_access" ON biblioteca_cortes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_biblioteca_cortes_equipo
  ON biblioteca_cortes (equipo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biblioteca_cortes_partido
  ON biblioteca_cortes (partido_id) WHERE partido_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_biblioteca_cortes_fase
  ON biblioteca_cortes (equipo_id, fase) WHERE fase IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_biblioteca_cortes_revision
  ON biblioteca_cortes (equipo_id, revision_clip_id)
  WHERE revision_clip_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS biblioteca_corte_jugadores (
    corte_id UUID NOT NULL REFERENCES biblioteca_cortes(id) ON DELETE CASCADE,
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (corte_id, jugador_id)
);

ALTER TABLE biblioteca_corte_jugadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON biblioteca_corte_jugadores;
CREATE POLICY "service_role_full_access" ON biblioteca_corte_jugadores FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_biblioteca_corte_jugadores_jugador
  ON biblioteca_corte_jugadores (jugador_id);
