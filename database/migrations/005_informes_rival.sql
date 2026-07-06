-- ============================================
-- TRAININGHUB PRO - INFORMES RIVAL ENRIQUECIDOS
-- Migración 005: Tabla para informes tácticos completos del rival
-- ============================================

CREATE TABLE IF NOT EXISTS informes_rival (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rival_id UUID NOT NULL REFERENCES rivales(id) ON DELETE CASCADE,
    partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL,

    -- Sistema y estilo
    sistema_juego VARCHAR(10),
    sistema_variantes JSONB DEFAULT '[]',
    estilo VARCHAR(50),

    -- Análisis táctico
    fortalezas JSONB DEFAULT '[]',
    debilidades JSONB DEFAULT '[]',
    jugadores_clave JSONB DEFAULT '[]',
    lesionados_sancionados JSONB DEFAULT '[]',

    -- Historial reciente
    ultimos_partidos JSONB DEFAULT '[]',

    -- ABP
    abp_ofensivo TEXT,
    abp_defensivo TEXT,

    -- Mapa de presión (coordenadas normalizadas)
    mapa_presion JSONB,

    -- Notas del analista
    notas TEXT,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_informes_rival_rival ON informes_rival(rival_id);
CREATE INDEX IF NOT EXISTS idx_informes_rival_partido ON informes_rival(partido_id);
CREATE INDEX IF NOT EXISTS idx_informes_rival_created ON informes_rival(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_informes_rival_updated_at
    BEFORE UPDATE ON informes_rival
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE informes_rival ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver informes de rivales de su organización"
    ON informes_rival FOR SELECT
    USING (
        rival_id IN (
            SELECT r.id FROM rivales r
            JOIN usuarios u ON r.organizacion_id = u.organizacion_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Técnicos pueden gestionar informes"
    ON informes_rival FOR ALL
    USING (
        rival_id IN (
            SELECT r.id FROM rivales r
            JOIN usuarios u ON r.organizacion_id = u.organizacion_id
            WHERE u.id = auth.uid()
            AND u.rol IN ('admin', 'tecnico_principal', 'tecnico_asistente', 'analista')
        )
    );

COMMENT ON TABLE informes_rival IS 'Informes tácticos enriquecidos del rival';
COMMENT ON COLUMN informes_rival.mapa_presion IS 'Coordenadas normalizadas del campo con zonas de presión';
COMMENT ON COLUMN informes_rival.jugadores_clave IS 'Array de {nombre, dorsal, posicion, tipo, analisis}';
COMMENT ON COLUMN informes_rival.ultimos_partidos IS 'Array de {fecha, rival, resultado, goles_favor, goles_contra, sistema}';
