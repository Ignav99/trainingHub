-- Migration 013: Medical Module
-- Phase 5: GDPR Art. 9 special category data

BEGIN;

-- ============================================================
-- 1. REGISTROS_MEDICOS - Medical records (encrypted sensitive fields)
-- ============================================================

CREATE TABLE IF NOT EXISTS registros_medicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
        'lesion', 'enfermedad', 'reconocimiento_medico', 'prueba_esfuerzo',
        'rehabilitacion', 'alta_medica', 'informe_fisioterapia', 'otro'
    )),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    diagnostico TEXT,           -- ENCRYPTED at application level (AES-256-GCM)
    tratamiento TEXT,           -- ENCRYPTED
    medicacion TEXT,            -- ENCRYPTED
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    fecha_alta DATE,
    dias_baja_estimados INTEGER,
    dias_baja_reales INTEGER,
    protocolo_recuperacion JSONB,
    estado VARCHAR(20) DEFAULT 'activo'
        CHECK (estado IN ('activo', 'en_recuperacion', 'alta', 'cronico')),
    documentos JSONB DEFAULT '[]',
    creado_por UUID NOT NULL REFERENCES usuarios(id),
    solo_medico BOOLEAN DEFAULT true,
    encryption_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ACCESOS_MEDICOS_LOG - Mandatory GDPR Art. 9 access audit
-- ============================================================

CREATE TABLE IF NOT EXISTS accesos_medicos_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registro_medico_id UUID NOT NULL REFERENCES registros_medicos(id),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('ver', 'crear', 'editar', 'eliminar', 'exportar')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registros_medicos_jugador ON registros_medicos(jugador_id);
CREATE INDEX IF NOT EXISTS idx_registros_medicos_equipo ON registros_medicos(equipo_id);
CREATE INDEX IF NOT EXISTS idx_registros_medicos_tipo ON registros_medicos(tipo);
CREATE INDEX IF NOT EXISTS idx_registros_medicos_estado ON registros_medicos(estado);
CREATE INDEX IF NOT EXISTS idx_accesos_medicos_registro ON accesos_medicos_log(registro_medico_id);
CREATE INDEX IF NOT EXISTS idx_accesos_medicos_usuario ON accesos_medicos_log(usuario_id);

-- ============================================================
-- 3. RLS Policies for medical data
-- ============================================================

ALTER TABLE registros_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE accesos_medicos_log ENABLE ROW LEVEL SECURITY;

-- Fisio can read/write medical records for their team
CREATE POLICY registros_medicos_select ON registros_medicos FOR SELECT USING (
    equipo_id IN (
        SELECT equipo_id FROM usuarios_equipos
        WHERE usuario_id = auth.uid() AND rol_en_equipo = 'fisio'
    )
    OR equipo_id IN (
        SELECT equipo_id FROM usuarios_equipos
        WHERE usuario_id = auth.uid() AND rol_en_equipo = 'entrenador_principal'
    )
    OR jugador_id IN (
        SELECT id FROM jugadores WHERE usuario_id = auth.uid()
    )
    OR jugador_id IN (
        SELECT vt.jugador_id FROM vinculos_tutor vt
        WHERE vt.tutor_usuario_id = auth.uid()
        AND vt.consentimiento_otorgado = true
        AND vt.consentimiento_revocado = false
    )
);

CREATE POLICY registros_medicos_insert ON registros_medicos FOR INSERT WITH CHECK (
    equipo_id IN (
        SELECT equipo_id FROM usuarios_equipos
        WHERE usuario_id = auth.uid() AND rol_en_equipo = 'fisio'
    )
);

CREATE POLICY registros_medicos_update ON registros_medicos FOR UPDATE USING (
    equipo_id IN (
        SELECT equipo_id FROM usuarios_equipos
        WHERE usuario_id = auth.uid() AND rol_en_equipo = 'fisio'
    )
);

-- No DELETE policy - medical records are never deleted, only marked inactive

-- Access log policies
CREATE POLICY accesos_medicos_log_insert ON accesos_medicos_log FOR INSERT
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY accesos_medicos_log_select ON accesos_medicos_log FOR SELECT USING (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('superadmin_plataforma', 'presidente')
    )
);

COMMIT;
