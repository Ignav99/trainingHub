-- 026: Estadísticas de partido (equipo + jugador)
-- Team-level match statistics: shots, corners, fouls, cards, etc.

CREATE TABLE IF NOT EXISTS estadisticas_partido (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,

    -- Nuestro equipo
    tiros_a_puerta INTEGER DEFAULT 0,
    ocasiones_gol INTEGER DEFAULT 0,
    saques_esquina INTEGER DEFAULT 0,
    penaltis INTEGER DEFAULT 0,
    fueras_juego INTEGER DEFAULT 0,
    faltas_cometidas INTEGER DEFAULT 0,
    tarjetas_amarillas INTEGER DEFAULT 0,
    tarjetas_rojas INTEGER DEFAULT 0,
    balones_perdidos INTEGER DEFAULT 0,
    balones_recuperados INTEGER DEFAULT 0,

    -- Rival
    rival_tiros_a_puerta INTEGER DEFAULT 0,
    rival_ocasiones_gol INTEGER DEFAULT 0,
    rival_saques_esquina INTEGER DEFAULT 0,
    rival_penaltis INTEGER DEFAULT 0,
    rival_fueras_juego INTEGER DEFAULT 0,
    rival_faltas_cometidas INTEGER DEFAULT 0,
    rival_tarjetas_amarillas INTEGER DEFAULT 0,
    rival_tarjetas_rojas INTEGER DEFAULT 0,
    rival_balones_perdidos INTEGER DEFAULT 0,
    rival_balones_recuperados INTEGER DEFAULT 0,

    -- Goal analysis
    goles_por_periodo JSONB DEFAULT '{}'::jsonb,
    tipos_gol_favor JSONB DEFAULT '{}'::jsonb,
    tipos_gol_contra JSONB DEFAULT '{}'::jsonb,

    -- Tactical notes
    comentario_tactico TEXT DEFAULT '',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(partido_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estadisticas_partido_partido ON estadisticas_partido(partido_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_estadisticas_partido_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_estadisticas_partido_updated ON estadisticas_partido;
CREATE TRIGGER tr_estadisticas_partido_updated
    BEFORE UPDATE ON estadisticas_partido
    FOR EACH ROW
    EXECUTE FUNCTION update_estadisticas_partido_updated_at();

-- RLS
ALTER TABLE estadisticas_partido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estadisticas_partido_select" ON estadisticas_partido
    FOR SELECT USING (true);

CREATE POLICY "estadisticas_partido_insert" ON estadisticas_partido
    FOR INSERT WITH CHECK (true);

CREATE POLICY "estadisticas_partido_update" ON estadisticas_partido
    FOR UPDATE USING (true);

CREATE POLICY "estadisticas_partido_delete" ON estadisticas_partido
    FOR DELETE USING (true);
