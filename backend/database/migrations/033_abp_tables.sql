-- Migration 033: ABP (Balón Parado / Set Pieces) System
-- Tables for set piece library, rival scouting, match integration, and session linking

-- ============================================================
-- 1. abp_jugadas — Main library of set piece plays
-- ============================================================
CREATE TABLE IF NOT EXISTS abp_jugadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id UUID NOT NULL,
    equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
    creado_por UUID,
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(20),
    tipo VARCHAR(30) NOT NULL,
    lado VARCHAR(15) NOT NULL,
    subtipo VARCHAR(30),
    descripcion TEXT,
    senal_codigo VARCHAR(50),
    sistema_marcaje VARCHAR(20),
    notas_tacticas TEXT,
    fases JSONB NOT NULL DEFAULT '[]',
    asignaciones JSONB DEFAULT '[]',
    es_plantilla BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abp_jugadas_equipo ON abp_jugadas(equipo_id);
CREATE INDEX IF NOT EXISTS idx_abp_jugadas_tipo ON abp_jugadas(tipo, lado);
CREATE INDEX IF NOT EXISTS idx_abp_jugadas_org ON abp_jugadas(organizacion_id);

-- ============================================================
-- 2. abp_rival_jugadas — Rival set piece plays (scouting)
-- ============================================================
CREATE TABLE IF NOT EXISTS abp_rival_jugadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rival_id UUID NOT NULL REFERENCES rivales(id) ON DELETE CASCADE,
    organizacion_id UUID NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    lado VARCHAR(15) NOT NULL,
    subtipo VARCHAR(30),
    descripcion TEXT,
    fases JSONB NOT NULL DEFAULT '[]',
    video_url TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abp_rival_jugadas_rival ON abp_rival_jugadas(rival_id);
CREATE INDEX IF NOT EXISTS idx_abp_rival_jugadas_org ON abp_rival_jugadas(organizacion_id);

-- ============================================================
-- 3. abp_partido_jugadas — Plays assigned to a match
-- ============================================================
CREATE TABLE IF NOT EXISTS abp_partido_jugadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
    jugada_id UUID NOT NULL REFERENCES abp_jugadas(id) ON DELETE CASCADE,
    asignaciones_override JSONB,
    notas TEXT,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(partido_id, jugada_id)
);

CREATE INDEX IF NOT EXISTS idx_abp_partido_jugadas_partido ON abp_partido_jugadas(partido_id);

-- ============================================================
-- 4. abp_sesion_jugadas — Plays linked to training sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS abp_sesion_jugadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    jugada_id UUID NOT NULL REFERENCES abp_jugadas(id) ON DELETE CASCADE,
    notas TEXT,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sesion_id, jugada_id)
);

CREATE INDEX IF NOT EXISTS idx_abp_sesion_jugadas_sesion ON abp_sesion_jugadas(sesion_id);
