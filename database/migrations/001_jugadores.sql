-- ============================================================================
-- TRAININGHUB PRO - MIGRACIÓN: TABLA JUGADORES
-- ============================================================================
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TABLA: JUGADORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS jugadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relaciones
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    equipo_origen_id UUID REFERENCES equipos(id), -- Para jugadores prestados de inferiores

    -- Datos personales
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE,
    foto_url TEXT,
    dorsal INTEGER,

    -- Posiciones (almacenamos como array de códigos)
    posicion_principal VARCHAR(20) NOT NULL,
    posiciones_secundarias JSONB DEFAULT '[]',

    -- Datos físicos
    altura DECIMAL(3,2), -- en metros (ej: 1.75)
    peso DECIMAL(4,1),   -- en kg
    pierna_dominante VARCHAR(20) DEFAULT 'derecha' CHECK (pierna_dominante IN ('derecha', 'izquierda', 'ambas')),

    -- Niveles (1-10)
    nivel_tecnico INTEGER DEFAULT 5 CHECK (nivel_tecnico BETWEEN 1 AND 10),
    nivel_tactico INTEGER DEFAULT 5 CHECK (nivel_tactico BETWEEN 1 AND 10),
    nivel_fisico INTEGER DEFAULT 5 CHECK (nivel_fisico BETWEEN 1 AND 10),
    nivel_mental INTEGER DEFAULT 5 CHECK (nivel_mental BETWEEN 1 AND 10),

    -- Estado
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'lesionado', 'sancionado', 'baja')),
    fecha_lesion DATE,
    fecha_vuelta_estimada DATE,
    motivo_baja TEXT,

    -- Flags
    es_capitan BOOLEAN DEFAULT false,
    es_convocable BOOLEAN DEFAULT true, -- Para jugadores de inferiores
    es_portero BOOLEAN DEFAULT false,

    -- Notas
    notas TEXT,

    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_jugadores_equipo ON jugadores(equipo_id);
CREATE INDEX idx_jugadores_posicion ON jugadores(posicion_principal);
CREATE INDEX idx_jugadores_estado ON jugadores(estado);

-- Trigger para updated_at
CREATE TRIGGER update_jugadores_updated_at BEFORE UPDATE ON jugadores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLA: POSICIONES (Catálogo de referencia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS posiciones (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    nombre_corto VARCHAR(10) NOT NULL,
    zona VARCHAR(20) NOT NULL, -- porteria, defensa, mediocampo, ataque
    orden INTEGER DEFAULT 0
);

INSERT INTO posiciones (codigo, nombre, nombre_corto, zona, orden) VALUES
-- Portería
('POR', 'Portero', 'POR', 'porteria', 1),
-- Defensa
('DFC', 'Defensa Central', 'DFC', 'defensa', 2),
('LTD', 'Lateral Derecho', 'LD', 'defensa', 3),
('LTI', 'Lateral Izquierdo', 'LI', 'defensa', 4),
('CAD', 'Carrilero Derecho', 'CAD', 'defensa', 5),
('CAI', 'Carrilero Izquierdo', 'CAI', 'defensa', 6),
-- Mediocampo
('MCD', 'Mediocentro Defensivo', 'MCD', 'mediocampo', 7),
('MC', 'Mediocentro', 'MC', 'mediocampo', 8),
('MCO', 'Mediocentro Ofensivo', 'MCO', 'mediocampo', 9),
('MID', 'Mediapunta Interior Derecha', 'MID', 'mediocampo', 10),
('MII', 'Mediapunta Interior Izquierda', 'MII', 'mediocampo', 11),
-- Ataque
('EXD', 'Extremo Derecho', 'ED', 'ataque', 12),
('EXI', 'Extremo Izquierdo', 'EI', 'ataque', 13),
('MP', 'Mediapunta', 'MP', 'ataque', 14),
('DC', 'Delantero Centro', 'DC', 'ataque', 15),
('SD', 'Segundo Delantero', 'SD', 'ataque', 16)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- RLS PARA JUGADORES (Deshabilitado temporalmente para demo)
-- ============================================================================
-- ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Usuarios ven jugadores de su organización" ON jugadores
--     FOR SELECT USING (
--         equipo_id IN (
--             SELECT id FROM equipos WHERE organizacion_id IN (
--                 SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
--             )
--         )
--     );

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
