-- Migration 011: Invitations and Ownership Transfers
-- Phase 2: Invitation system

BEGIN;

-- ============================================================
-- 1. INVITACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS invitaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    nombre VARCHAR(255),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
    rol_organizacion VARCHAR(50),
    rol_en_equipo VARCHAR(50),
    token VARCHAR(128) UNIQUE NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'expirada', 'revocada')),
    expira_en TIMESTAMPTZ NOT NULL,
    invitado_por UUID NOT NULL REFERENCES usuarios(id),
    aceptado_por UUID REFERENCES usuarios(id),
    fecha_respuesta TIMESTAMPTZ,
    reinvitaciones INTEGER DEFAULT 0,
    ultimo_reenvio TIMESTAMPTZ,
    es_invitacion_tutor BOOLEAN DEFAULT false,
    jugador_id UUID REFERENCES jugadores(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TRANSFERENCIAS_PROPIEDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS transferencias_propiedad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id),
    de_usuario_id UUID NOT NULL REFERENCES usuarios(id),
    a_usuario_id UUID NOT NULL REFERENCES usuarios(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'expirada')),
    token VARCHAR(128) UNIQUE NOT NULL,
    expira_en TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    fecha_respuesta TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON invitaciones(email);
CREATE INDEX IF NOT EXISTS idx_invitaciones_org ON invitaciones(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_invitaciones_token_hash ON invitaciones(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitaciones_estado ON invitaciones(estado);
CREATE INDEX IF NOT EXISTS idx_transferencias_equipo ON transferencias_propiedad(equipo_id);

COMMIT;
