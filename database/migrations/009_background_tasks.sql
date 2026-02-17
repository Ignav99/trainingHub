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
