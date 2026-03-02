-- Migration 012: GDPR, Parental Control, and Tutor System
-- Phase 4: RGPD/LOPD compliance

BEGIN;

-- ============================================================
-- 1. VINCULOS_TUTOR - Parent/Guardian links to minor players
-- ============================================================

CREATE TABLE IF NOT EXISTS vinculos_tutor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    tutor_usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    relacion VARCHAR(30) NOT NULL CHECK (relacion IN ('padre', 'madre', 'tutor_legal')),
    consentimiento_otorgado BOOLEAN NOT NULL DEFAULT false,
    consentimiento_fecha TIMESTAMPTZ,
    consentimiento_ip VARCHAR(45),
    consentimiento_metodo VARCHAR(30) CHECK (consentimiento_metodo IN ('digital', 'presencial', 'documento')),
    documento_consentimiento_url TEXT,
    consentimiento_revocado BOOLEAN DEFAULT false,
    revocacion_fecha TIMESTAMPTZ,
    revocacion_motivo TEXT,
    activo BOOLEAN DEFAULT true,
    verificado BOOLEAN DEFAULT false,
    verificado_por UUID REFERENCES usuarios(id),
    verificado_fecha TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(jugador_id, tutor_usuario_id)
);

-- ============================================================
-- 2. CONSENTIMIENTOS_GDPR - Consent tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS consentimientos_gdpr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
        'terminos_servicio', 'politica_privacidad', 'datos_personales',
        'datos_medicos', 'comunicaciones_marketing', 'tratamiento_imagen',
        'transferencia_datos', 'menor_representacion'
    )),
    version VARCHAR(20) NOT NULL,
    otorgado BOOLEAN NOT NULL DEFAULT false,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revocado BOOLEAN DEFAULT false,
    revocado_fecha TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. SOLICITUDES_GDPR - Data subject rights requests
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitudes_gdpr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
        'acceso', 'rectificacion', 'supresion', 'portabilidad', 'oposicion', 'limitacion'
    )),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'rechazada')),
    descripcion TEXT,
    respuesta TEXT,
    procesado_por UUID REFERENCES usuarios(id),
    fecha_limite TIMESTAMPTZ NOT NULL,
    fecha_completada TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vinculos_tutor_jugador ON vinculos_tutor(jugador_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_tutor_tutor ON vinculos_tutor(tutor_usuario_id);
CREATE INDEX IF NOT EXISTS idx_consentimientos_usuario ON consentimientos_gdpr(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_gdpr_usuario ON solicitudes_gdpr(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_gdpr_estado ON solicitudes_gdpr(estado);

COMMIT;
