-- ============================================
-- TRAININGHUB PRO - PARTIDOS Y RIVALES
-- Migración 004: Tablas para gestión de partidos y equipos rivales
-- ============================================

-- ============================================
-- TABLA: rivales
-- Equipos contrarios con los que se juega
-- ============================================

CREATE TABLE IF NOT EXISTS rivales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,

    -- Datos básicos
    nombre VARCHAR(100) NOT NULL,
    nombre_corto VARCHAR(10),
    escudo_url TEXT,

    -- Ubicación
    estadio VARCHAR(100),
    ciudad VARCHAR(100),

    -- Notas
    notas TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rivales_organizacion ON rivales(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_rivales_nombre ON rivales(nombre);

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_rivales_updated_at
    BEFORE UPDATE ON rivales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE rivales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver rivales de su organización"
    ON rivales FOR SELECT
    USING (
        organizacion_id IN (
            SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY "Técnicos pueden gestionar rivales"
    ON rivales FOR ALL
    USING (
        organizacion_id IN (
            SELECT organizacion_id FROM usuarios
            WHERE id = auth.uid()
            AND rol IN ('admin', 'tecnico_principal', 'tecnico_asistente')
        )
    );


-- ============================================
-- TABLA: partidos
-- Registro de partidos (pasados y futuros)
-- ============================================

CREATE TABLE IF NOT EXISTS partidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    rival_id UUID NOT NULL REFERENCES rivales(id) ON DELETE RESTRICT,

    -- Fecha y hora
    fecha DATE NOT NULL,
    hora VARCHAR(5), -- HH:MM

    -- Tipo de partido
    localia VARCHAR(20) NOT NULL DEFAULT 'local' CHECK (localia IN ('local', 'visitante', 'neutral')),
    competicion VARCHAR(20) NOT NULL DEFAULT 'liga' CHECK (competicion IN ('liga', 'copa', 'amistoso', 'torneo', 'otro')),
    jornada INTEGER CHECK (jornada IS NULL OR jornada >= 1),

    -- Resultado (NULL si no se ha jugado)
    goles_favor INTEGER CHECK (goles_favor IS NULL OR goles_favor >= 0),
    goles_contra INTEGER CHECK (goles_contra IS NULL OR goles_contra >= 0),
    resultado VARCHAR(20) CHECK (resultado IS NULL OR resultado IN ('victoria', 'empate', 'derrota')),

    -- Análisis
    notas_pre TEXT,  -- Notas previas al partido (análisis rival)
    notas_post TEXT, -- Notas post-partido (análisis propio)
    video_url TEXT,  -- URL a vídeo del partido
    informe_url TEXT, -- URL a informe PDF

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_partidos_equipo ON partidos(equipo_id);
CREATE INDEX IF NOT EXISTS idx_partidos_rival ON partidos(rival_id);
CREATE INDEX IF NOT EXISTS idx_partidos_fecha ON partidos(fecha);
CREATE INDEX IF NOT EXISTS idx_partidos_competicion ON partidos(competicion);

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_partidos_updated_at
    BEFORE UPDATE ON partidos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular resultado automáticamente
CREATE OR REPLACE FUNCTION calculate_resultado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.goles_favor IS NOT NULL AND NEW.goles_contra IS NOT NULL THEN
        IF NEW.goles_favor > NEW.goles_contra THEN
            NEW.resultado := 'victoria';
        ELSIF NEW.goles_favor < NEW.goles_contra THEN
            NEW.resultado := 'derrota';
        ELSE
            NEW.resultado := 'empate';
        END IF;
    ELSE
        NEW.resultado := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER calculate_partido_resultado
    BEFORE INSERT OR UPDATE OF goles_favor, goles_contra ON partidos
    FOR EACH ROW
    EXECUTE FUNCTION calculate_resultado();

-- RLS
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver partidos de equipos de su organización"
    ON partidos FOR SELECT
    USING (
        equipo_id IN (
            SELECT e.id FROM equipos e
            JOIN usuarios u ON e.organizacion_id = u.organizacion_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Técnicos pueden gestionar partidos"
    ON partidos FOR ALL
    USING (
        equipo_id IN (
            SELECT e.id FROM equipos e
            JOIN usuarios u ON e.organizacion_id = u.organizacion_id
            WHERE u.id = auth.uid()
            AND u.rol IN ('admin', 'tecnico_principal', 'tecnico_asistente')
        )
    );


-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE rivales IS 'Equipos rivales contra los que se juega';
COMMENT ON TABLE partidos IS 'Registro de partidos jugados y por jugar';

COMMENT ON COLUMN partidos.localia IS 'local, visitante o neutral';
COMMENT ON COLUMN partidos.competicion IS 'liga, copa, amistoso, torneo, otro';
COMMENT ON COLUMN partidos.resultado IS 'Calculado automáticamente: victoria, empate, derrota';
