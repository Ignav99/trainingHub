-- Migration 006: Fix Auth RLS
-- Habilitar RLS en tablas que faltan y añadir policies

-- ============ HABILITAR RLS ============

ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE posiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_day_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE rivales ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES: CATALOGOS (lectura publica) ============

-- Posiciones: catálogo público de solo lectura
CREATE POLICY "posiciones_select_public" ON posiciones
    FOR SELECT USING (true);

-- Categorías de tarea: catálogo público de solo lectura
CREATE POLICY "categorias_tarea_select_public" ON categorias_tarea
    FOR SELECT USING (true);

-- Match day config: catálogo público de solo lectura
CREATE POLICY "match_day_config_select_public" ON match_day_config
    FOR SELECT USING (true);

-- ============ POLICIES: JUGADORES (por organización) ============

-- Jugadores visibles por equipos de la organización del usuario
CREATE POLICY "jugadores_select" ON jugadores
    FOR SELECT USING (
        equipo_id IN (
            SELECT e.id FROM equipos e
            INNER JOIN usuarios_equipos ue ON ue.equipo_id = e.id
            WHERE ue.usuario_id = auth.uid()
        )
    );

CREATE POLICY "jugadores_insert" ON jugadores
    FOR INSERT WITH CHECK (
        equipo_id IN (
            SELECT e.id FROM equipos e
            INNER JOIN usuarios_equipos ue ON ue.equipo_id = e.id
            WHERE ue.usuario_id = auth.uid()
        )
    );

CREATE POLICY "jugadores_update" ON jugadores
    FOR UPDATE USING (
        equipo_id IN (
            SELECT e.id FROM equipos e
            INNER JOIN usuarios_equipos ue ON ue.equipo_id = e.id
            WHERE ue.usuario_id = auth.uid()
        )
    );

CREATE POLICY "jugadores_delete" ON jugadores
    FOR DELETE USING (
        equipo_id IN (
            SELECT e.id FROM equipos e
            INNER JOIN usuarios_equipos ue ON ue.equipo_id = e.id
            WHERE ue.usuario_id = auth.uid()
        )
    );

-- ============ POLICIES: RIVALES (por organización) ============

CREATE POLICY "rivales_select" ON rivales
    FOR SELECT USING (
        organizacion_id IN (
            SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY "rivales_insert" ON rivales
    FOR INSERT WITH CHECK (
        organizacion_id IN (
            SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY "rivales_update" ON rivales
    FOR UPDATE USING (
        organizacion_id IN (
            SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY "rivales_delete" ON rivales
    FOR DELETE USING (
        organizacion_id IN (
            SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- ============ POLICIES: PARTIDOS (por equipo) ============

CREATE POLICY "partidos_select" ON partidos
    FOR SELECT USING (
        equipo_id IN (
            SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid()
        )
    );

CREATE POLICY "partidos_insert" ON partidos
    FOR INSERT WITH CHECK (
        equipo_id IN (
            SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid()
        )
    );

CREATE POLICY "partidos_update" ON partidos
    FOR UPDATE USING (
        equipo_id IN (
            SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid()
        )
    );

CREATE POLICY "partidos_delete" ON partidos
    FOR DELETE USING (
        equipo_id IN (
            SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid()
        )
    );
