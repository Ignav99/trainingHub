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
