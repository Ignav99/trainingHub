-- Tablero del cuerpo técnico: comentarios, preguntas, tareas y avisos con
-- respuestas y menciones. Las notificaciones ganan autor, equipo, enlace y
-- la marca «presentada» (ya salió como aviso emergente; sigue sin leer en la campana).

CREATE TABLE IF NOT EXISTS staff_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES staff_posts(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'comentario'
        CHECK (tipo IN ('comentario', 'pregunta', 'tarea', 'aviso')),
    contenido TEXT NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 5000),
    menciones UUID[] NOT NULL DEFAULT '{}',
    asignado_a UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_limite DATE,
    estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'resuelta')),
    resuelto_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    resuelto_at TIMESTAMPTZ,
    entidad_tipo TEXT CHECK (entidad_tipo IN ('sesion', 'partido', 'jugador', 'rival')),
    entidad_id UUID,
    entidad_titulo TEXT,
    fijado BOOLEAN NOT NULL DEFAULT FALSE,
    editado_at TIMESTAMPTZ,
    ultima_actividad_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE staff_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON staff_posts;
CREATE POLICY "service_role_full_access" ON staff_posts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_staff_posts_feed
    ON staff_posts (equipo_id, ultima_actividad_at DESC) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_posts_respuestas
    ON staff_posts (parent_id, created_at) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_posts_tareas
    ON staff_posts (equipo_id, asignado_a) WHERE tipo = 'tarea' AND estado = 'abierta';
CREATE INDEX IF NOT EXISTS idx_staff_posts_entidad
    ON staff_posts (equipo_id, entidad_tipo, entidad_id) WHERE entidad_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_posts_menciones
    ON staff_posts USING GIN (menciones);

ALTER TABLE notificaciones
    ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS url TEXT,
    ADD COLUMN IF NOT EXISTS presentada BOOLEAN NOT NULL DEFAULT TRUE;
-- Las existentes quedan como ya presentadas; las nuevas nacen sin presentar.
ALTER TABLE notificaciones ALTER COLUMN presentada SET DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_pendientes
    ON notificaciones (usuario_id, created_at DESC) WHERE leida = FALSE;
