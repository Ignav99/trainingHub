-- 076: Ficha clínica — valoraciones y tests datados (cuaderno de campo)
-- Cada toma lleva fecha para comparar pretemporada vs controles de temporada.
-- (074 ya está ocupado por sesion_estructura_fases.)

ALTER TABLE jugadores
  ADD COLUMN IF NOT EXISTS nivel_tecnico_comentario TEXT,
  ADD COLUMN IF NOT EXISTS nivel_tactico_comentario TEXT,
  ADD COLUMN IF NOT EXISTS nivel_fisico_comentario TEXT,
  ADD COLUMN IF NOT EXISTS nivel_mental_comentario TEXT;

CREATE TABLE IF NOT EXISTS jugador_evaluaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    bloque VARCHAR(20) NOT NULL CHECK (bloque IN ('valoracion', 'tests')),
    fecha DATE NOT NULL,
    momento VARCHAR(30) NOT NULL DEFAULT 'control' CHECK (momento IN (
        'pretemporada',
        'inicio_temporada',
        'control',
        'post_lesion',
        'fin_temporada',
        'otro'
    )),
    titulo VARCHAR(160),
    datos JSONB NOT NULL DEFAULT '{}'::jsonb,
    notas TEXT,
    creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jugador_evaluaciones_jugador_fecha
  ON jugador_evaluaciones (jugador_id, bloque, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_jugador_evaluaciones_equipo
  ON jugador_evaluaciones (equipo_id, fecha DESC);

ALTER TABLE jugador_evaluaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON jugador_evaluaciones;
CREATE POLICY "service_role_all" ON jugador_evaluaciones
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_jugador_evaluaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jugador_evaluaciones_updated_at ON jugador_evaluaciones;
CREATE TRIGGER trg_jugador_evaluaciones_updated_at
    BEFORE UPDATE ON jugador_evaluaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_jugador_evaluaciones_updated_at();

COMMENT ON TABLE jugador_evaluaciones IS
  'Tomas clínicas datadas: valoración postural/antropométrica/artromuscular o batería de tests.';

NOTIFY pgrst, 'reload schema';
