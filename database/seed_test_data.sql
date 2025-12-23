-- ============================================================================
-- TRAININGHUB PRO - DATOS DE PRUEBA
-- ============================================================================
-- Ejecutar en Supabase SQL Editor después de schema.sql
-- ============================================================================

-- 1. Crear organización de prueba
INSERT INTO organizaciones (id, nombre, color_primario, color_secundario)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Club Demo FC',
    '#1a365d',
    '#ffffff'
) ON CONFLICT (id) DO NOTHING;

-- 2. Crear equipo de prueba
INSERT INTO equipos (id, organizacion_id, nombre, categoria, temporada, num_jugadores_plantilla, sistema_juego)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Primer Equipo',
    'Senior',
    '2024-2025',
    22,
    '1-4-3-3'
) ON CONFLICT (id) DO NOTHING;

-- 3. Crear segundo equipo de prueba
INSERT INTO equipos (id, organizacion_id, nombre, categoria, temporada, num_jugadores_plantilla, sistema_juego)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Juvenil A',
    'Juvenil',
    '2024-2025',
    20,
    '1-4-4-2'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NOTA: Para vincular tu usuario existente a esta organización:
-- Ejecuta esto reemplazando TU_EMAIL con tu email real:
-- ============================================================================
-- UPDATE usuarios
-- SET organizacion_id = 'a0000000-0000-0000-0000-000000000001',
--     rol = 'admin',
--     activo = true
-- WHERE email = 'TU_EMAIL';

-- ============================================================================
-- Si necesitas crear jugadores de prueba:
-- ============================================================================

-- Crear tabla de jugadores si no existe
CREATE TABLE IF NOT EXISTS jugadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    dorsal INTEGER CHECK (dorsal > 0 AND dorsal < 100),
    foto_url TEXT,

    -- Posición
    posicion_principal VARCHAR(10) NOT NULL,
    posiciones_secundarias JSONB DEFAULT '[]',
    es_portero BOOLEAN DEFAULT false,

    -- Físico
    altura DECIMAL(3,2),
    peso DECIMAL(4,1),
    pierna_dominante VARCHAR(20) DEFAULT 'derecha' CHECK (pierna_dominante IN ('derecha', 'izquierda', 'ambas')),

    -- Niveles
    nivel_tecnico INTEGER DEFAULT 5 CHECK (nivel_tecnico BETWEEN 1 AND 10),
    nivel_tactico INTEGER DEFAULT 5 CHECK (nivel_tactico BETWEEN 1 AND 10),
    nivel_fisico INTEGER DEFAULT 5 CHECK (nivel_fisico BETWEEN 1 AND 10),
    nivel_mental INTEGER DEFAULT 5 CHECK (nivel_mental BETWEEN 1 AND 10),

    -- Estado
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN (
        'activo', 'lesionado', 'enfermo', 'sancionado',
        'viaje', 'permiso', 'seleccion', 'baja'
    )),
    motivo_baja TEXT,
    fecha_lesion DATE,
    fecha_vuelta_estimada DATE,

    -- Opciones
    es_capitan BOOLEAN DEFAULT false,
    es_convocable BOOLEAN DEFAULT true,

    -- Notas
    notas TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jugadores_equipo ON jugadores(equipo_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_posicion ON jugadores(posicion_principal);
CREATE INDEX IF NOT EXISTS idx_jugadores_estado ON jugadores(estado);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_jugadores_updated_at ON jugadores;
CREATE TRIGGER update_jugadores_updated_at BEFORE UPDATE ON jugadores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;

-- Políticas para jugadores
DROP POLICY IF EXISTS "Usuarios ven jugadores de sus equipos" ON jugadores;
CREATE POLICY "Usuarios ven jugadores de sus equipos" ON jugadores
    FOR SELECT USING (
        equipo_id IN (
            SELECT id FROM equipos WHERE organizacion_id IN (
                SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Técnicos gestionan jugadores" ON jugadores;
CREATE POLICY "Técnicos gestionan jugadores" ON jugadores
    FOR ALL USING (
        equipo_id IN (
            SELECT id FROM equipos WHERE organizacion_id IN (
                SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
                AND rol IN ('admin', 'tecnico_principal', 'tecnico_asistente')
            )
        )
    );

-- Insertar jugadores de ejemplo para el Primer Equipo
INSERT INTO jugadores (equipo_id, nombre, apellidos, fecha_nacimiento, dorsal, posicion_principal, altura, peso, nivel_tecnico, nivel_tactico, nivel_fisico, nivel_mental, es_capitan)
VALUES
-- Porteros
('b0000000-0000-0000-0000-000000000001', 'Carlos', 'Martínez López', '1995-03-15', 1, 'POR', 1.88, 82.0, 7, 6, 7, 8, false),
('b0000000-0000-0000-0000-000000000001', 'David', 'García Ruiz', '1998-07-22', 13, 'POR', 1.85, 78.0, 6, 5, 6, 6, false),

-- Defensas
('b0000000-0000-0000-0000-000000000001', 'Miguel', 'Fernández Soto', '1996-01-08', 2, 'LTD', 1.78, 74.0, 6, 7, 8, 7, false),
('b0000000-0000-0000-0000-000000000001', 'Pablo', 'Rodríguez Vega', '1994-11-25', 3, 'DFC', 1.86, 82.0, 5, 8, 7, 8, true),
('b0000000-0000-0000-0000-000000000001', 'Andrés', 'López Moreno', '1997-05-12', 4, 'DFC', 1.84, 80.0, 6, 7, 8, 7, false),
('b0000000-0000-0000-0000-000000000001', 'Sergio', 'Sánchez Gil', '1999-09-03', 5, 'LTI', 1.76, 72.0, 7, 6, 8, 6, false),
('b0000000-0000-0000-0000-000000000001', 'Álvaro', 'Torres Díaz', '1995-12-18', 22, 'CAD', 1.75, 70.0, 6, 7, 7, 7, false),

-- Mediocampistas
('b0000000-0000-0000-0000-000000000001', 'Javier', 'Hernández Castro', '1996-04-30', 6, 'MCD', 1.80, 76.0, 7, 8, 7, 8, false),
('b0000000-0000-0000-0000-000000000001', 'Luis', 'Martín Ramos', '1998-08-14', 8, 'MC', 1.77, 73.0, 8, 7, 6, 7, false),
('b0000000-0000-0000-0000-000000000001', 'Daniel', 'Gómez Prieto', '1997-02-28', 10, 'MCO', 1.75, 71.0, 9, 7, 5, 7, false),
('b0000000-0000-0000-0000-000000000001', 'Antonio', 'Pérez Navarro', '1999-06-11', 14, 'MCD', 1.82, 77.0, 6, 8, 8, 6, false),
('b0000000-0000-0000-0000-000000000001', 'Francisco', 'Ruiz Blanco', '1996-10-05', 15, 'MC', 1.78, 74.0, 7, 7, 7, 7, false),

-- Atacantes
('b0000000-0000-0000-0000-000000000001', 'Alejandro', 'Jiménez Luna', '1997-01-20', 7, 'EXD', 1.74, 69.0, 8, 6, 8, 6, false),
('b0000000-0000-0000-0000-000000000001', 'Roberto', 'Morales Serrano', '1995-09-28', 9, 'DC', 1.83, 79.0, 8, 6, 7, 8, false),
('b0000000-0000-0000-0000-000000000001', 'Adrián', 'Vázquez Ortiz', '1998-03-07', 11, 'EXI', 1.72, 68.0, 9, 5, 7, 6, false),
('b0000000-0000-0000-0000-000000000001', 'Jorge', 'Domínguez Arias', '1999-12-01', 17, 'SD', 1.78, 73.0, 7, 7, 6, 7, false),
('b0000000-0000-0000-0000-000000000001', 'Iván', 'Castro Molina', '2000-04-15', 19, 'DC', 1.80, 76.0, 7, 5, 8, 5, false),
('b0000000-0000-0000-0000-000000000001', 'Marcos', 'Ortega Santos', '2001-07-30', 21, 'EXI', 1.70, 66.0, 8, 5, 7, 5, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIN DE DATOS DE PRUEBA
-- ============================================================================
SELECT 'Datos de prueba insertados correctamente' as resultado;
