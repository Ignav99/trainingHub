-- ============================================================
-- Migration 023: Actas Detalle + Escudo Rivales
-- Tabla para almacenar actas completas de partidos RFAF
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS rfef_actas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competicion_id UUID NOT NULL REFERENCES rfef_competiciones(id) ON DELETE CASCADE,
    jornada_numero INTEGER NOT NULL,
    cod_acta TEXT NOT NULL UNIQUE,
    local_nombre TEXT NOT NULL,
    visitante_nombre TEXT NOT NULL,
    local_escudo_url TEXT,
    visitante_escudo_url TEXT,
    goles_local INTEGER,
    goles_visitante INTEGER,
    estadio TEXT,
    ciudad TEXT,
    fecha DATE,
    hora TIME,
    titulares_local JSONB DEFAULT '[]',
    suplentes_local JSONB DEFAULT '[]',
    titulares_visitante JSONB DEFAULT '[]',
    suplentes_visitante JSONB DEFAULT '[]',
    goles JSONB DEFAULT '[]',
    tarjetas_local JSONB DEFAULT '[]',
    tarjetas_visitante JSONB DEFAULT '[]',
    sustituciones_local JSONB DEFAULT '[]',
    sustituciones_visitante JSONB DEFAULT '[]',
    cuerpo_tecnico_local JSONB DEFAULT '{}',
    cuerpo_tecnico_visitante JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfef_actas_comp ON rfef_actas(competicion_id);
CREATE INDEX IF NOT EXISTS idx_rfef_actas_cod ON rfef_actas(cod_acta);
CREATE INDEX IF NOT EXISTS idx_rfef_actas_jornada ON rfef_actas(competicion_id, jornada_numero);

-- Escudo URL para rivales (se extrae de las actas RFAF)
ALTER TABLE rivales ADD COLUMN IF NOT EXISTS escudo_url TEXT;

COMMIT;
