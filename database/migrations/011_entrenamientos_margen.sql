-- ============================================================
-- Migration 011: Entrenamientos al Margen
-- Sistema de trabajo personalizado para jugadores al margen
-- (lesionados, fisio, recuperacion)
-- ============================================================

-- ============================================================
-- TABLA: entrenamientos_margen
-- Plan de trabajo para un jugador al margen en una sesion
-- ============================================================
CREATE TABLE IF NOT EXISTS entrenamientos_margen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    registro_medico_id UUID REFERENCES registros_medicos(id) ON DELETE SET NULL,
    objetivo TEXT,
    notas TEXT,
    responsable VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'planificado' CHECK (estado IN ('planificado','en_curso','completado','cancelado')),
    fase_recuperacion VARCHAR(50) CHECK (fase_recuperacion IN (
        'fase_1_control_dolor',
        'fase_2_movilidad',
        'fase_3_fuerza_base',
        'fase_4_fuerza_funcional',
        'fase_5_carrera_lineal',
        'fase_6_cambios_direccion',
        'fase_7_entrenamiento_equipo',
        'fase_8_competicion',
        NULL
    )),
    duracion_estimada INTEGER,
    rpe_post INTEGER CHECK (rpe_post IS NULL OR rpe_post BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sesion_id, jugador_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entrenamientos_margen_sesion ON entrenamientos_margen(sesion_id);
CREATE INDEX IF NOT EXISTS idx_entrenamientos_margen_jugador ON entrenamientos_margen(jugador_id);
CREATE INDEX IF NOT EXISTS idx_entrenamientos_margen_registro ON entrenamientos_margen(registro_medico_id);
CREATE INDEX IF NOT EXISTS idx_entrenamientos_margen_estado ON entrenamientos_margen(estado);

-- ============================================================
-- TABLA: entrenamientos_margen_tareas
-- Ejercicios individuales dentro de un entrenamiento al margen
-- ============================================================
CREATE TABLE IF NOT EXISTS entrenamientos_margen_tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrenamiento_margen_id UUID NOT NULL REFERENCES entrenamientos_margen(id) ON DELETE CASCADE,
    tarea_id UUID REFERENCES tareas(id) ON DELETE SET NULL,
    orden INTEGER NOT NULL DEFAULT 1,
    titulo_custom VARCHAR(255),
    descripcion_custom TEXT,
    duracion INTEGER,
    series INTEGER DEFAULT 1,
    repeticiones VARCHAR(50),
    descanso VARCHAR(50),
    carga VARCHAR(100),
    tipo_ejercicio VARCHAR(30) CHECK (tipo_ejercicio IN (
        'movilidad','activacion','fuerza','propioceptivo',
        'cardio','campo','pliometria','flexibilidad','otro',
        NULL
    )),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_tiene_titulo CHECK (tarea_id IS NOT NULL OR titulo_custom IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_margen_tareas_entrenamiento ON entrenamientos_margen_tareas(entrenamiento_margen_id);
CREATE INDEX IF NOT EXISTS idx_margen_tareas_tarea ON entrenamientos_margen_tareas(tarea_id);

-- ============================================================
-- TRIGGER: updated_at automatico
-- ============================================================
CREATE OR REPLACE FUNCTION update_entrenamientos_margen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entrenamientos_margen_updated_at ON entrenamientos_margen;
CREATE TRIGGER trg_entrenamientos_margen_updated_at
    BEFORE UPDATE ON entrenamientos_margen
    FOR EACH ROW
    EXECUTE FUNCTION update_entrenamientos_margen_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE entrenamientos_margen ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrenamientos_margen_tareas ENABLE ROW LEVEL SECURITY;

-- entrenamientos_margen: acceso via sesion → equipo → organizacion
CREATE POLICY "entrenamientos_margen_select" ON entrenamientos_margen
    FOR SELECT USING (true);

CREATE POLICY "entrenamientos_margen_insert" ON entrenamientos_margen
    FOR INSERT WITH CHECK (true);

CREATE POLICY "entrenamientos_margen_update" ON entrenamientos_margen
    FOR UPDATE USING (true);

CREATE POLICY "entrenamientos_margen_delete" ON entrenamientos_margen
    FOR DELETE USING (true);

-- entrenamientos_margen_tareas: acceso via entrenamiento padre
CREATE POLICY "margen_tareas_select" ON entrenamientos_margen_tareas
    FOR SELECT USING (true);

CREATE POLICY "margen_tareas_insert" ON entrenamientos_margen_tareas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "margen_tareas_update" ON entrenamientos_margen_tareas
    FOR UPDATE USING (true);

CREATE POLICY "margen_tareas_delete" ON entrenamientos_margen_tareas
    FOR DELETE USING (true);
