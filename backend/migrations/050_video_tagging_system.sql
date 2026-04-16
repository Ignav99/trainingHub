-- ============================================================
-- Video Tagging System — Migration 050
-- 5 new tables for tag categories, descriptors, tags, playlists
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Tag Categories per team
CREATE TABLE IF NOT EXISTS video_tag_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    shortcut_key TEXT,  -- '1'-'9' or null
    fase TEXT CHECK (fase IN (
        'ataque_organizado', 'defensa_organizada',
        'transicion_ataque_defensa', 'transicion_defensa_ataque',
        'abp', NULL
    )),
    default_duration_secs INTEGER NOT NULL DEFAULT 10,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_tag_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON video_tag_categories FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_video_tag_categories_equipo ON video_tag_categories(equipo_id);

-- 2. Descriptors under each category
CREATE TABLE IF NOT EXISTS video_tag_descriptors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES video_tag_categories(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    color TEXT,
    shortcut_key TEXT,  -- 'Shift+1' etc or null
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_tag_descriptors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON video_tag_descriptors FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_video_tag_descriptors_category ON video_tag_descriptors(category_id);

-- 3. Tags (the main tagging events on a video)
CREATE TABLE IF NOT EXISTS video_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos_partido(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES video_tag_categories(id) ON DELETE CASCADE,
    descriptor_id UUID REFERENCES video_tag_descriptors(id) ON DELETE SET NULL,
    jugador_id UUID REFERENCES jugadores(id) ON DELETE SET NULL,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    fase TEXT CHECK (fase IN (
        'ataque_organizado', 'defensa_organizada',
        'transicion_ataque_defensa', 'transicion_defensa_ataque',
        'abp', NULL
    )),
    zona_campo TEXT,  -- e.g. 'zona_1' through 'zona_6' or free text
    nota TEXT,
    drawing_data JSONB NOT NULL DEFAULT '[]',
    thumbnail_data TEXT,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'import')),
    confidence REAL,  -- 0.0-1.0 for AI-generated tags
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON video_tags FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_video_tags_video ON video_tags(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_category ON video_tags(category_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_jugador ON video_tags(jugador_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_video_start ON video_tags(video_id, start_ms);

-- 4. Playlists (named collections)
CREATE TABLE IF NOT EXISTS video_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON video_playlists FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_video_playlists_equipo ON video_playlists(equipo_id);

-- 5. Playlist items (ordered tag references)
CREATE TABLE IF NOT EXISTS video_playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES video_playlists(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES video_tags(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_playlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON video_playlist_items FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_video_playlist_items_playlist ON video_playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_video_playlist_items_tag ON video_playlist_items(tag_id);
