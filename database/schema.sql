-- ============================================================================
-- TRAININGHUB PRO - ESQUEMA DE BASE DE DATOS
-- ============================================================================
-- Ejecutar en Supabase SQL Editor
-- Versión: 1.0.0
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA: ORGANIZACIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    logo_url TEXT,
    color_primario VARCHAR(7) DEFAULT '#1a365d',
    color_secundario VARCHAR(7) DEFAULT '#ffffff',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA: EQUIPOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS equipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    temporada VARCHAR(20),
    num_jugadores_plantilla INTEGER DEFAULT 22,
    sistema_juego VARCHAR(20) DEFAULT '1-4-3-3',
    config JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipos_organizacion ON equipos(organizacion_id);

-- ============================================================================
-- TABLA: USUARIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255),
    avatar_url TEXT,
    rol VARCHAR(50) NOT NULL DEFAULT 'tecnico_asistente' 
        CHECK (rol IN ('admin', 'tecnico_principal', 'tecnico_asistente', 'visualizador')),
    organizacion_id UUID REFERENCES organizaciones(id),
    config JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usuarios_organizacion ON usuarios(organizacion_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- ============================================================================
-- TABLA: USUARIOS_EQUIPOS (Relación N:M)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios_equipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    rol_en_equipo VARCHAR(50) DEFAULT 'segundo_entrenador',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, equipo_id)
);

CREATE INDEX idx_usuarios_equipos_usuario ON usuarios_equipos(usuario_id);
CREATE INDEX idx_usuarios_equipos_equipo ON usuarios_equipos(equipo_id);

-- ============================================================================
-- TABLA: CATEGORIAS_TAREA
-- ============================================================================
CREATE TABLE IF NOT EXISTS categorias_tarea (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    nombre_corto VARCHAR(50),
    descripcion TEXT,
    naturaleza VARCHAR(50),
    objetivo_principal TEXT,
    icono VARCHAR(50),
    color VARCHAR(7),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true
);

-- Insertar categorías predefinidas
INSERT INTO categorias_tarea (codigo, nombre, nombre_corto, naturaleza, descripcion, color, orden) VALUES
('RND', 'Rondo', 'Rondo', 'micro', 'Ejercicio de posesión en espacio reducido. Técnica en fatiga, velocidad mental, perfiles.', '#3B82F6', 1),
('JDP', 'Juego de Posición', 'JdP', 'meso', 'Trabajo posicional con estructura real del equipo. Hombre libre, viajar juntos.', '#10B981', 2),
('POS', 'Posesión/Conservación', 'Posesión', 'variable', 'Mantenimiento de balón flexible. Condición física integrada.', '#8B5CF6', 3),
('EVO', 'Evoluciones/Oleadas', 'Evolución', 'meso', 'Ataques repetitivos con automatismos de finalización.', '#F59E0B', 4),
('AVD', 'Ataque vs Defensa', 'AvsD', 'meso', 'Trabajo sectorial/intersectorial simulando fase de juego.', '#EF4444', 5),
('PCO', 'Partido Condicionado', 'Partido', 'macro', 'Juego real con condiciones. Transferencia total al plan de partido.', '#EC4899', 6),
('ACO', 'Acciones Combinadas', 'Circuito', 'micro', 'Circuitos sin oposición. Ajuste técnico, calentamiento.', '#6B7280', 7),
('SSG', 'Fútbol Reducido', 'SSG', 'micro', 'Small Sided Games. Alta intensidad, duelos, fuerza.', '#14B8A6', 8),
('ABP', 'Balón Parado', 'ABP', 'estrategia', 'Acciones a balón parado: córners, faltas, saques.', '#F97316', 9)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- TABLA: TAREAS (PRINCIPAL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tareas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    titulo VARCHAR(255) NOT NULL,
    codigo VARCHAR(50),
    categoria_id UUID REFERENCES categorias_tarea(id),
    
    -- Propiedad
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id),
    equipo_id UUID REFERENCES equipos(id),
    creado_por UUID REFERENCES usuarios(id),
    
    -- Tiempo
    duracion_total INTEGER NOT NULL,
    num_series INTEGER DEFAULT 1,
    duracion_serie INTEGER,
    tiempo_descanso INTEGER DEFAULT 0,
    
    -- Espacio
    espacio_largo DECIMAL(5,1),
    espacio_ancho DECIMAL(5,1),
    espacio_forma VARCHAR(50) DEFAULT 'rectangular',
    
    -- Jugadores
    num_jugadores_min INTEGER NOT NULL,
    num_jugadores_max INTEGER,
    num_porteros INTEGER DEFAULT 0,
    estructura_equipos VARCHAR(100),
    
    -- Descripción
    descripcion TEXT,
    como_inicia TEXT,
    como_finaliza TEXT,
    
    -- Reglas de provocación
    reglas_tecnicas JSONB DEFAULT '[]',
    reglas_tacticas JSONB DEFAULT '[]',
    reglas_psicologicas JSONB DEFAULT '[]',
    forma_puntuar TEXT,
    
    -- Contenido táctico
    fase_juego VARCHAR(50) CHECK (fase_juego IN (
        'ataque_organizado', 
        'defensa_organizada', 
        'transicion_ataque_defensa', 
        'transicion_defensa_ataque'
    )),
    principio_tactico VARCHAR(255),
    subprincipio_tactico VARCHAR(255),
    accion_tecnica VARCHAR(255),
    intencion_tactica VARCHAR(255),
    
    -- Carga física
    tipo_esfuerzo VARCHAR(100),
    m2_por_jugador DECIMAL(6,1),
    ratio_trabajo_descanso VARCHAR(20),
    densidad VARCHAR(20) CHECK (densidad IN ('alta', 'media', 'baja')),
    fc_esperada_min INTEGER,
    fc_esperada_max INTEGER,
    
    -- Carga cognitiva
    nivel_cognitivo INTEGER CHECK (nivel_cognitivo BETWEEN 1 AND 3),
    
    -- Coaching points
    consignas_ofensivas JSONB DEFAULT '[]',
    consignas_defensivas JSONB DEFAULT '[]',
    errores_comunes JSONB DEFAULT '[]',
    
    -- Gráfico
    grafico_url TEXT,
    grafico_svg TEXT,
    grafico_data JSONB,
    
    -- Metadatos
    es_plantilla BOOLEAN DEFAULT false,
    es_publica BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]',
    valoracion_media DECIMAL(2,1),
    num_usos INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_tareas_organizacion ON tareas(organizacion_id);
CREATE INDEX idx_tareas_equipo ON tareas(equipo_id);
CREATE INDEX idx_tareas_categoria ON tareas(categoria_id);
CREATE INDEX idx_tareas_fase ON tareas(fase_juego);
CREATE INDEX idx_tareas_nivel_cognitivo ON tareas(nivel_cognitivo);
CREATE INDEX idx_tareas_creado_por ON tareas(creado_por);

-- ============================================================================
-- TABLA: SESIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    titulo VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    
    -- Contexto
    equipo_id UUID NOT NULL REFERENCES equipos(id),
    creado_por UUID REFERENCES usuarios(id),
    
    -- Match Day
    match_day VARCHAR(10) NOT NULL,
    rival VARCHAR(255),
    competicion VARCHAR(255),
    
    -- Planificación
    duracion_total INTEGER,
    objetivo_principal TEXT,
    
    -- Objetivo táctico
    fase_juego_principal VARCHAR(50),
    principio_tactico_principal VARCHAR(255),
    
    -- Carga
    carga_fisica_objetivo VARCHAR(100),
    intensidad_objetivo VARCHAR(20) CHECK (intensidad_objetivo IN ('alta', 'media', 'baja', 'muy_baja')),
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'planificada', 'completada', 'cancelada')),
    
    -- Notas
    notas_pre TEXT,
    notas_post TEXT,
    
    -- PDF
    pdf_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sesiones_equipo ON sesiones(equipo_id);
CREATE INDEX idx_sesiones_fecha ON sesiones(fecha);
CREATE INDEX idx_sesiones_match_day ON sesiones(match_day);

-- ============================================================================
-- TABLA: SESION_TAREAS (Relación con orden)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sesion_tareas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    tarea_id UUID NOT NULL REFERENCES tareas(id),
    
    -- Orden y fase
    orden INTEGER NOT NULL,
    fase_sesion VARCHAR(50) NOT NULL CHECK (fase_sesion IN (
        'activacion',
        'desarrollo_1',
        'desarrollo_2',
        'vuelta_calma'
    )),
    
    -- Sobrescritura
    duracion_override INTEGER,
    notas TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(sesion_id, orden)
);

CREATE INDEX idx_sesion_tareas_sesion ON sesion_tareas(sesion_id);
CREATE INDEX idx_sesion_tareas_tarea ON sesion_tareas(tarea_id);

-- ============================================================================
-- TABLA: MATCH_DAY_CONFIG (Referencia para recomendador)
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_day_config (
    codigo VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(50),
    dias_desde_partido INTEGER,
    carga_fisica VARCHAR(100),
    espacios_recomendados VARCHAR(255),
    nivel_cognitivo_max INTEGER,
    descripcion TEXT,
    categorias_preferidas JSONB DEFAULT '[]',
    categorias_evitar JSONB DEFAULT '[]',
    orden INTEGER
);

INSERT INTO match_day_config VALUES
('MD+1', 'Recuperación', 1, 'Recuperación activa', 'Amplios, sin intensidad', 1, 'Día después del partido. Carga muy baja.', '["RND", "ACO"]', '["SSG", "AVD", "PCO"]', 1),
('MD+2', 'Regeneración', 2, 'Regeneración', 'Amplios', 1, 'Segundo día post-partido.', '["RND", "ACO", "POS"]', '["SSG", "AVD"]', 2),
('MD-4', 'Fuerza/Tensión', -4, 'Fuerza explosiva', 'Reducidos, muchos duelos', 3, 'Espacios reducidos, alta aceleración.', '["SSG", "JDP", "AVD"]', '["ACO"]', 3),
('MD-3', 'Resistencia', -3, 'Resistencia a la potencia', 'Grandes, tiempos largos', 3, 'Espacios grandes, mayor número.', '["JDP", "POS", "PCO", "AVD"]', '["SSG"]', 4),
('MD-2', 'Velocidad', -2, 'Velocidad máxima', 'Medios/grandes, cortos', 2, 'Alta velocidad, mucha pausa.', '["EVO", "JDP"]', '["SSG", "PCO"]', 5),
('MD-1', 'Activación', -1, 'Activación/Reacción', 'Variables', 2, 'Rondos, velocidad reacción, ABP.', '["RND", "ABP", "ACO"]', '["SSG", "AVD", "PCO"]', 6),
('MD', 'Partido', 0, 'Competición', 'Campo completo', 3, 'Día de partido.', '[]', '[]', 7)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_organizaciones_updated_at BEFORE UPDATE ON organizaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipos_updated_at BEFORE UPDATE ON equipos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tareas_updated_at BEFORE UPDATE ON tareas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sesiones_updated_at BEFORE UPDATE ON sesiones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para incrementar num_usos de tarea
CREATE OR REPLACE FUNCTION increment_tarea_uso()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tareas SET num_usos = num_usos + 1 WHERE id = NEW.tarea_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_increment_tarea_uso AFTER INSERT ON sesion_tareas
    FOR EACH ROW EXECUTE FUNCTION increment_tarea_uso();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_tareas ENABLE ROW LEVEL SECURITY;

-- Políticas para ORGANIZACIONES
CREATE POLICY "Usuarios ven su organización" ON organizaciones
    FOR SELECT USING (
        id IN (SELECT organizacion_id FROM usuarios WHERE id = auth.uid())
    );

CREATE POLICY "Admins editan su organización" ON organizaciones
    FOR UPDATE USING (
        id IN (SELECT organizacion_id FROM usuarios WHERE id = auth.uid() AND rol = 'admin')
    );

-- Políticas para EQUIPOS
CREATE POLICY "Usuarios ven equipos de su organización" ON equipos
    FOR SELECT USING (
        organizacion_id IN (SELECT organizacion_id FROM usuarios WHERE id = auth.uid())
    );

CREATE POLICY "Admins gestionan equipos" ON equipos
    FOR ALL USING (
        organizacion_id IN (SELECT organizacion_id FROM usuarios WHERE id = auth.uid() AND rol = 'admin')
    );

-- Políticas para USUARIOS
CREATE POLICY "Usuarios se ven a sí mismos" ON usuarios
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins ven usuarios de su organización" ON usuarios
    FOR SELECT USING (
        organizacion_id IN (SELECT organizacion_id FROM usuarios WHERE id = auth.uid() AND rol = 'admin')
    );

CREATE POLICY "Usuarios editan su perfil" ON usuarios
    FOR UPDATE USING (id = auth.uid());

-- Políticas para TAREAS
CREATE POLICY "Usuarios ven tareas de su organización" ON tareas
    FOR SELECT USING (
        organizacion_id IN (SELECT organizacion_id FROM usuarios WHERE id = auth.uid())
    );

CREATE POLICY "Técnicos crean tareas" ON tareas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'tecnico_principal', 'tecnico_asistente')
        )
    );

CREATE POLICY "Usuarios editan sus tareas" ON tareas
    FOR UPDATE USING (
        creado_por = auth.uid() OR
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'tecnico_principal'))
    );

CREATE POLICY "Usuarios eliminan sus tareas" ON tareas
    FOR DELETE USING (
        creado_por = auth.uid() OR
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin')
    );

-- Políticas para SESIONES
CREATE POLICY "Usuarios ven sesiones de sus equipos" ON sesiones
    FOR SELECT USING (
        equipo_id IN (
            SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid()
            UNION
            SELECT id FROM equipos WHERE organizacion_id IN (
                SELECT organizacion_id FROM usuarios WHERE id = auth.uid() AND rol = 'admin'
            )
        )
    );

CREATE POLICY "Técnicos crean sesiones" ON sesiones
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'tecnico_principal', 'tecnico_asistente')
        )
    );

CREATE POLICY "Usuarios editan sus sesiones" ON sesiones
    FOR UPDATE USING (
        creado_por = auth.uid() OR
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'tecnico_principal'))
    );

-- Políticas para SESION_TAREAS
CREATE POLICY "Usuarios ven tareas de sesiones accesibles" ON sesion_tareas
    FOR SELECT USING (
        sesion_id IN (SELECT id FROM sesiones)
    );

CREATE POLICY "Usuarios gestionan tareas de sus sesiones" ON sesion_tareas
    FOR ALL USING (
        sesion_id IN (
            SELECT id FROM sesiones WHERE creado_por = auth.uid()
            UNION
            SELECT s.id FROM sesiones s
            JOIN usuarios u ON u.id = auth.uid()
            WHERE u.rol IN ('admin', 'tecnico_principal')
        )
    );

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Ejecutar esto después de crear las tablas:
-- 
-- INSERT INTO storage.buckets (id, name, public) VALUES 
--     ('logos', 'logos', true),
--     ('graficos', 'graficos', false),
--     ('pdfs', 'pdfs', false);
--
-- Políticas de storage se configuran en el dashboard de Supabase

-- ============================================================================
-- FIN DEL ESQUEMA
-- ============================================================================
