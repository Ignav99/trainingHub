-- ============================================
-- Migration 020: Shared Knowledge (Global Patterns)
-- ============================================
-- Aggregated, anonymized patterns from all organizations
-- for AI recommendations based on collective best practices.

CREATE TABLE IF NOT EXISTS conocimiento_global (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL,  -- patron_ejercicio, estructura_sesion, coaching_point, match_day_pattern
    match_day VARCHAR(10),
    categoria_codigo VARCHAR(10),
    fase_juego VARCHAR(50),
    contenido JSONB NOT NULL,   -- anonymized aggregated data
    frecuencia INTEGER DEFAULT 1,
    confianza DECIMAL(3,2) DEFAULT 0.5,  -- 0.0 to 1.0
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_conocimiento_global_tipo ON conocimiento_global (tipo);
CREATE INDEX IF NOT EXISTS idx_conocimiento_global_match_day ON conocimiento_global (match_day) WHERE match_day IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conocimiento_global_categoria ON conocimiento_global (categoria_codigo) WHERE categoria_codigo IS NOT NULL;
