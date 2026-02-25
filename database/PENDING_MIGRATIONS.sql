-- ============================================================
-- Migration 009: Background Tasks System
-- Trackea tareas de larga duracion (indexacion, exports, etc.)
-- ============================================================

CREATE TABLE background_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'procesando', 'completada', 'fallida', 'cancelada')),
    progreso SMALLINT DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
    mensaje TEXT,
    resultado JSONB,
    error TEXT,
    -- Context
    usuario_id UUID REFERENCES usuarios(id),
    organizacion_id UUID REFERENCES organizaciones(id),
    entidad_tipo VARCHAR(50),
    entidad_id UUID,
    parametros JSONB,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indices
CREATE INDEX idx_bg_tasks_usuario ON background_tasks(usuario_id);
CREATE INDEX idx_bg_tasks_org ON background_tasks(organizacion_id);
CREATE INDEX idx_bg_tasks_estado ON background_tasks(estado);
CREATE INDEX idx_bg_tasks_tipo ON background_tasks(tipo);
CREATE INDEX idx_bg_tasks_created ON background_tasks(created_at DESC);

-- RLS
ALTER TABLE background_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bg_tasks_select" ON background_tasks FOR SELECT USING (true);
CREATE POLICY "bg_tasks_insert" ON background_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "bg_tasks_update" ON background_tasks FOR UPDATE USING (true);

-- Auto-cleanup: delete completed tasks older than 7 days
-- (run via pg_cron or manual cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_background_tasks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM background_tasks
    WHERE estado IN ('completada', 'fallida', 'cancelada')
      AND created_at < NOW() - INTERVAL '7 days';
END;
$$;
-- Migration 010: Planes, Suscripciones, and core ALTERs
-- Phase 0: Foundation for licensing, roles, and security

BEGIN;

-- ============================================================
-- 1. PLANES - Subscription plan catalog
-- ============================================================

CREATE TABLE IF NOT EXISTS planes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo_licencia VARCHAR(20) NOT NULL CHECK (tipo_licencia IN ('equipo', 'club')),
    max_equipos INTEGER NOT NULL DEFAULT 1,
    max_usuarios_por_equipo INTEGER NOT NULL DEFAULT 5,
    max_jugadores_por_equipo INTEGER NOT NULL DEFAULT 25,
    max_storage_mb INTEGER NOT NULL DEFAULT 500,
    max_ai_calls_month INTEGER NOT NULL DEFAULT 50,
    max_kb_documents INTEGER NOT NULL DEFAULT 10,
    features JSONB NOT NULL DEFAULT '{}',
    precio_mensual_cents INTEGER NOT NULL DEFAULT 0,
    precio_anual_cents INTEGER NOT NULL DEFAULT 0,
    dias_prueba INTEGER DEFAULT 0,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO planes (codigo, nombre, tipo_licencia, max_equipos, max_usuarios_por_equipo, max_jugadores_por_equipo, max_storage_mb, max_ai_calls_month, max_kb_documents, features, precio_mensual_cents, precio_anual_cents, dias_prueba, orden) VALUES
('free_trial', 'Prueba Gratis', 'equipo', 1, 3, 25, 100, 10, 3, '{"video_enabled": false, "rival_analysis_enabled": false, "rfef_enabled": false, "medical_enabled": false, "branding_enabled": false, "advanced_stats_enabled": false, "ai_enabled": true}', 0, 0, 14, 0),
('equipo_basico', 'Equipo Basico', 'equipo', 1, 5, 30, 500, 30, 10, '{"video_enabled": false, "rival_analysis_enabled": true, "rfef_enabled": false, "medical_enabled": false, "branding_enabled": false, "advanced_stats_enabled": false, "ai_enabled": true}', 999, 9990, 0, 1),
('equipo_premium', 'Equipo Premium', 'equipo', 1, 10, 40, 2048, 100, 50, '{"video_enabled": true, "rival_analysis_enabled": true, "rfef_enabled": true, "medical_enabled": true, "branding_enabled": true, "advanced_stats_enabled": true, "ai_enabled": true}', 1999, 19990, 0, 2),
('club_basico', 'Club Basico', 'club', 5, 8, 30, 5120, 100, 50, '{"video_enabled": true, "rival_analysis_enabled": true, "rfef_enabled": true, "medical_enabled": false, "branding_enabled": true, "advanced_stats_enabled": true, "ai_enabled": true}', 4999, 49990, 0, 3),
('club_premium', 'Club Premium', 'club', 20, 15, 50, 20480, 500, 200, '{"video_enabled": true, "rival_analysis_enabled": true, "rfef_enabled": true, "medical_enabled": true, "branding_enabled": true, "advanced_stats_enabled": true, "ai_enabled": true}', 9999, 99990, 0, 4)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 2. ALTER organizaciones
-- ============================================================

ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS tipo_licencia VARCHAR(20)
    DEFAULT 'equipo' CHECK (tipo_licencia IN ('equipo', 'club'));
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- ============================================================
-- 3. SUSCRIPCIONES - One per organization
-- ============================================================

CREATE TABLE IF NOT EXISTS suscripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL UNIQUE REFERENCES organizaciones(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES planes(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'trial'
        CHECK (estado IN ('trial', 'active', 'past_due', 'grace_period', 'suspended', 'cancelled')),
    ciclo VARCHAR(10) NOT NULL DEFAULT 'mensual' CHECK (ciclo IN ('mensual', 'anual')),
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    fecha_proximo_pago TIMESTAMPTZ,
    fecha_cancelacion TIMESTAMPTZ,
    fecha_gracia_fin TIMESTAMPTZ,
    trial_fin TIMESTAMPTZ,
    trial_convertido BOOLEAN DEFAULT false,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    uso_equipos INTEGER DEFAULT 0,
    uso_storage_mb INTEGER DEFAULT 0,
    uso_ai_calls_month INTEGER DEFAULT 0,
    uso_ai_calls_reset_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. HISTORIAL_SUSCRIPCIONES - Change history
-- ============================================================

CREATE TABLE IF NOT EXISTS historial_suscripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id),
    plan_anterior_id UUID REFERENCES planes(id),
    plan_nuevo_id UUID REFERENCES planes(id),
    accion VARCHAR(30) NOT NULL CHECK (accion IN (
        'created', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'suspended', 'reactivated')),
    motivo TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ALTER usuarios - Expand roles and add fields
-- ============================================================

-- Drop old constraint and add expanded one
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN (
    'superadmin_plataforma',
    'admin',
    'presidente', 'director_deportivo', 'secretario',
    'entrenador_principal', 'segundo_entrenador', 'preparador_fisico',
    'entrenador_porteros', 'analista', 'fisio', 'delegado',
    'tecnico_principal', 'tecnico_asistente', 'visualizador',
    'jugador', 'tutor'
));

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_menor BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS gdpr_consentimiento BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS gdpr_consentimiento_fecha TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;

-- ============================================================
-- 6. ALTER usuarios_equipos - Expand team roles
-- ============================================================

ALTER TABLE usuarios_equipos DROP CONSTRAINT IF EXISTS usuarios_equipos_rol_en_equipo_check;
ALTER TABLE usuarios_equipos ADD CONSTRAINT usuarios_equipos_rol_en_equipo_check CHECK (
    rol_en_equipo IN (
        'entrenador_principal', 'segundo_entrenador', 'preparador_fisico',
        'entrenador_porteros', 'analista', 'fisio', 'delegado', 'jugador'
    )
);

-- ============================================================
-- 7. PERMISOS_PERSONALIZADOS - Custom per-role/user overrides
-- ============================================================

CREATE TABLE IF NOT EXISTS permisos_personalizados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    rol_en_equipo VARCHAR(50),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    puede_crear_sesiones BOOLEAN,
    puede_editar_sesiones BOOLEAN,
    puede_eliminar_sesiones BOOLEAN,
    puede_crear_tareas BOOLEAN,
    puede_editar_tareas BOOLEAN,
    puede_eliminar_tareas BOOLEAN,
    puede_gestionar_plantilla BOOLEAN,
    puede_crear_convocatorias BOOLEAN,
    puede_ver_rivales BOOLEAN,
    puede_editar_rivales BOOLEAN,
    puede_subir_videos BOOLEAN,
    puede_exportar BOOLEAN,
    puede_usar_ai BOOLEAN,
    puede_gestionar_kb BOOLEAN,
    puede_ver_datos_medicos BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_permisos_equipo_rol UNIQUE (equipo_id, rol_en_equipo),
    CONSTRAINT uq_permisos_equipo_usuario UNIQUE (equipo_id, usuario_id)
);

-- ============================================================
-- 8. ALTER audit_log - Expand actions and add fields
-- ============================================================

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES organizaciones(id);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS severidad VARCHAR(10)
    DEFAULT 'info' CHECK (severidad IN ('info', 'warning', 'critical'));
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS resultado VARCHAR(10)
    DEFAULT 'exito' CHECK (resultado IN ('exito', 'fallo', 'denegado'));

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_accion_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_accion_check CHECK (accion IN (
    'crear', 'actualizar', 'eliminar',
    'login', 'logout', 'login_fallido',
    'invitar', 'aceptar_invitacion', 'revocar_acceso',
    'ver_datos_medicos', 'exportar_datos',
    'cambiar_rol', 'transferir_propiedad',
    'consentimiento_gdpr', 'solicitud_gdpr',
    'cambiar_password', 'activar_mfa', 'acceso_denegado'
));

-- ============================================================
-- 9. Backfill: Create trial subscription for existing orgs
-- ============================================================

INSERT INTO suscripciones (organizacion_id, plan_id, estado, trial_fin, uso_ai_calls_reset_at)
SELECT
    o.id,
    (SELECT id FROM planes WHERE codigo = 'free_trial' LIMIT 1),
    'trial',
    NOW() + INTERVAL '14 days',
    (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')
FROM organizaciones o
WHERE NOT EXISTS (
    SELECT 1 FROM suscripciones s WHERE s.organizacion_id = o.id
);

-- ============================================================
-- 10. Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_suscripciones_org ON suscripciones(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX IF NOT EXISTS idx_historial_suscripciones_org ON historial_suscripciones(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_permisos_personalizados_equipo ON permisos_personalizados(equipo_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_equipo ON audit_log(equipo_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

COMMIT;
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

-- ============================================================
-- Migration 022: Competition Management
-- mi_equipo, auto-link partidos, perfil rival
-- ============================================================

ALTER TABLE rfef_competiciones ADD COLUMN IF NOT EXISTS mi_equipo_nombre TEXT;
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS rfef_competicion_id UUID REFERENCES rfef_competiciones(id) ON DELETE SET NULL;
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS auto_creado BOOLEAN DEFAULT false;
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS ubicacion TEXT;
ALTER TABLE rivales ADD COLUMN IF NOT EXISTS rfef_nombre TEXT;
ALTER TABLE rivales ADD COLUMN IF NOT EXISTS sistema_juego VARCHAR(20);
ALTER TABLE rivales ADD COLUMN IF NOT EXISTS estilo VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_partidos_rfef_comp ON partidos(rfef_competicion_id);
CREATE INDEX IF NOT EXISTS idx_rivales_rfef_nombre ON rivales(rfef_nombre);
