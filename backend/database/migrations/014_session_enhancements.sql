-- =====================================================
-- Migration 014: Session Enhancements
-- Asistencias, personalizacion, auto-link microciclo
-- =====================================================

-- 1. Tabla asistencias_sesion
CREATE TABLE IF NOT EXISTS asistencias_sesion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    presente BOOLEAN NOT NULL DEFAULT true,
    motivo_ausencia VARCHAR(100),
    notas TEXT,
    hora_llegada TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sesion_id, jugador_id)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_sesion ON asistencias_sesion(sesion_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_jugador ON asistencias_sesion(jugador_id);

ALTER TABLE asistencias_sesion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asistencias_all" ON asistencias_sesion FOR ALL USING (true);

-- 2. Columnas nuevas en sesiones
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS materiales JSONB DEFAULT '[]';
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS staff_asistentes JSONB DEFAULT '[]';
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS fase_notas JSONB DEFAULT '{}';

-- 3. Trigger auto-link sesion -> microciclo
CREATE OR REPLACE FUNCTION auto_link_sesion_microciclo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.microciclo_id IS NULL THEN
        SELECT id INTO NEW.microciclo_id
        FROM microciclos
        WHERE equipo_id = NEW.equipo_id
          AND NEW.fecha BETWEEN fecha_inicio AND fecha_fin
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_link_sesion_microciclo ON sesiones;
CREATE TRIGGER trigger_auto_link_sesion_microciclo
    BEFORE INSERT OR UPDATE OF fecha ON sesiones
    FOR EACH ROW EXECUTE FUNCTION auto_link_sesion_microciclo();
