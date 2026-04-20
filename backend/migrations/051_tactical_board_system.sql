-- ============================================================
-- 051: Tactical Board System (Pizarra Táctica)
-- Tables: tactical_boards, tactical_board_frames
-- ============================================================

-- 1. Main boards table
CREATE TABLE IF NOT EXISTS tactical_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL DEFAULT 'static' CHECK (tipo IN ('static', 'animated')),
    pitch_type TEXT NOT NULL DEFAULT 'full' CHECK (pitch_type IN ('full', 'half')),
    home_team JSONB DEFAULT '[]'::JSONB,
    away_team JSONB DEFAULT '[]'::JSONB,
    elements JSONB DEFAULT '[]'::JSONB,
    arrows JSONB DEFAULT '[]'::JSONB,
    zones JSONB DEFAULT '[]'::JSONB,
    thumbnail_data TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tactical_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON tactical_boards FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tactical_boards_equipo ON tactical_boards(equipo_id);
CREATE INDEX IF NOT EXISTS idx_tactical_boards_tipo ON tactical_boards(equipo_id, tipo);

-- 2. Keyframe frames for animated boards
CREATE TABLE IF NOT EXISTS tactical_board_frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES tactical_boards(id) ON DELETE CASCADE,
    orden INT NOT NULL DEFAULT 0,
    nombre TEXT,
    duration_ms INT NOT NULL DEFAULT 2000,
    elements JSONB DEFAULT '[]'::JSONB,
    arrows JSONB DEFAULT '[]'::JSONB,
    zones JSONB DEFAULT '[]'::JSONB,
    transition_type TEXT NOT NULL DEFAULT 'linear' CHECK (transition_type IN ('linear', 'ease', 'ease-in-out')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tactical_board_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON tactical_board_frames FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tactical_board_frames_board ON tactical_board_frames(board_id);
CREATE INDEX IF NOT EXISTS idx_tactical_board_frames_order ON tactical_board_frames(board_id, orden);
