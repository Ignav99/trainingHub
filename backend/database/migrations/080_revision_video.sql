-- ============================================================
-- Revisión de vídeo — packs, carpetas, clips, sala
-- El partido entero nunca se sube. Solo recortes cortos.
-- ============================================================

-- Huella del fichero local (nombre+tamaño+duración) para reabrir tags/cortes
ALTER TABLE videos_partido
  ADD COLUMN IF NOT EXISTS local_file_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_partido_local_fingerprint
  ON videos_partido (equipo_id, partido_id, local_file_fingerprint)
  WHERE local_file_fingerprint IS NOT NULL AND tipo = 'local_session';

-- Pack de revisión (informe partido / rival / plan)
CREATE TABLE IF NOT EXISTS revision_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    ambito TEXT NOT NULL CHECK (ambito IN ('partido_post', 'rival', 'partido_plan')),
    partido_id UUID REFERENCES partidos(id) ON DELETE CASCADE,
    rival_id UUID REFERENCES rivales(id) ON DELETE CASCADE,
    microciclo_id UUID REFERENCES microciclos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE revision_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON revision_packs;
CREATE POLICY "service_role_full_access" ON revision_packs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_revision_packs_equipo ON revision_packs(equipo_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revision_packs_partido
  ON revision_packs (equipo_id, partido_id)
  WHERE ambito = 'partido_post' AND partido_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_revision_packs_rival
  ON revision_packs (equipo_id, rival_id, (COALESCE(microciclo_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  WHERE ambito = 'rival' AND rival_id IS NOT NULL;

-- Carpetas (fases canónicas + anidadas + personalizadas)
CREATE TABLE IF NOT EXISTS revision_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES revision_packs(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES revision_folders(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    fase TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE revision_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON revision_folders;
CREATE POLICY "service_role_full_access" ON revision_folders FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_revision_folders_pack ON revision_folders(pack_id);

-- Recortes (bytes en Storage mientras están calientes)
CREATE TABLE IF NOT EXISTS revision_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES revision_packs(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    frase TEXT,
    nota TEXT,
    url TEXT,
    storage_path TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    duration_ms INTEGER,
    fase TEXT,
    jugador_id UUID REFERENCES jugadores(id) ON DELETE SET NULL,
    rival_jugador_nombre TEXT,
    rival_jugador_dorsal TEXT,
    source_video_id UUID REFERENCES videos_partido(id) ON DELETE SET NULL,
    start_ms INTEGER,
    end_ms INTEGER,
    hot_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    drive_file_id TEXT,
    drive_path TEXT,
    status TEXT NOT NULL DEFAULT 'hot' CHECK (status IN ('hot', 'en_drive', 'missing')),
    archive_warning TEXT,
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE revision_clips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON revision_clips;
CREATE POLICY "service_role_full_access" ON revision_clips FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_revision_clips_pack ON revision_clips(pack_id);
CREATE INDEX IF NOT EXISTS idx_revision_clips_hot ON revision_clips(hot_until) WHERE status = 'hot';

-- Un clip puede vivir en varias carpetas / un jugador del 11
CREATE TABLE IF NOT EXISTS revision_clip_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES revision_clips(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES revision_folders(id) ON DELETE CASCADE,
    slot_tipo TEXT NOT NULL DEFAULT 'folder' CHECK (slot_tipo IN ('folder', 'once_jugador')),
    jugador_id UUID REFERENCES jugadores(id) ON DELETE SET NULL,
    rival_jugador_nombre TEXT,
    rival_jugador_dorsal TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE revision_clip_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON revision_clip_links;
CREATE POLICY "service_role_full_access" ON revision_clip_links FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_revision_clip_links_clip ON revision_clip_links(clip_id);
CREATE INDEX IF NOT EXISTS idx_revision_clip_links_folder ON revision_clip_links(folder_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revision_clip_links_folder_unique
  ON revision_clip_links (clip_id, folder_id)
  WHERE folder_id IS NOT NULL AND slot_tipo = 'folder';

-- Sala (host HDMI + tablet)
CREATE TABLE IF NOT EXISTS revision_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES revision_packs(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    host_user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    current_clip_id UUID REFERENCES revision_clips(id) ON DELETE SET NULL,
    current_time_ms INTEGER NOT NULL DEFAULT 0,
    paused BOOLEAN NOT NULL DEFAULT TRUE,
    overlay_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE revision_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON revision_sessions;
CREATE POLICY "service_role_full_access" ON revision_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revision_sessions_code ON revision_sessions (code);
CREATE INDEX IF NOT EXISTS idx_revision_sessions_equipo ON revision_sessions(equipo_id);
