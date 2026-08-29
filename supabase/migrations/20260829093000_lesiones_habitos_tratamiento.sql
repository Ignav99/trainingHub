-- Espejo de backend/database/migrations/077_lesiones_habitos_tratamiento.sql
-- 077: Lesiones persistentes por jugador, mapa corporal, tratamiento diario y hábitos.
-- El historial sigue al futbolista aunque cambie de plantilla (se lista por jugador_id).

ALTER TABLE registros_medicos
  ADD COLUMN IF NOT EXISTS es_historico BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS zonas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fase_tratamiento VARCHAR(30);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registros_medicos_fase_tratamiento_check'
  ) THEN
    ALTER TABLE registros_medicos
      ADD CONSTRAINT registros_medicos_fase_tratamiento_check
      CHECK (
        fase_tratamiento IS NULL OR fase_tratamiento IN (
          'reposo', 'margen', 'inicio_grupo', 'disponible'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN registros_medicos.es_historico IS
  'Lesión previa (otra etapa / otro club). No mueve la disponibilidad actual.';
COMMENT ON COLUMN registros_medicos.zonas IS
  'Zonas del mapa corporal: [{id, lado?}].';
COMMENT ON COLUMN registros_medicos.fase_tratamiento IS
  'Crescendo clínico (ficha/enfermería): reposo → margen → inicio grupo → disponible.';

CREATE TABLE IF NOT EXISTS tratamiento_diario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registro_medico_id UUID NOT NULL REFERENCES registros_medicos(id) ON DELETE CASCADE,
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    sesion_id UUID REFERENCES sesiones(id) ON DELETE SET NULL,
    entrenamiento_margen_id UUID,
    fase_tratamiento VARCHAR(30),
    trabajo TEXT,
    ejercicios TEXT,
    feedback TEXT,
    nutricion TEXT,
    suplementacion TEXT,
    creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tratamiento_diario_registro_fecha
  ON tratamiento_diario (registro_medico_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_tratamiento_diario_jugador
  ON tratamiento_diario (jugador_id, fecha DESC);

ALTER TABLE tratamiento_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON tratamiento_diario;
CREATE POLICY "service_role_all" ON tratamiento_diario
    FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_tratamiento_diario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tratamiento_diario_updated_at ON tratamiento_diario;
CREATE TRIGGER trg_tratamiento_diario_updated_at
    BEFORE UPDATE ON tratamiento_diario
    FOR EACH ROW
    EXECUTE FUNCTION update_tratamiento_diario_updated_at();

CREATE TABLE IF NOT EXISTS jugador_habitos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jugador_id UUID NOT NULL UNIQUE REFERENCES jugadores(id) ON DELETE CASCADE,
    comidas TEXT,
    sueno TEXT,
    actividades_nocivas TEXT,
    deportes_externos TEXT,
    notas TEXT,
    datos JSONB NOT NULL DEFAULT '{}'::jsonb,
    actualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jugador_habitos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON jugador_habitos;
CREATE POLICY "service_role_all" ON jugador_habitos
    FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_jugador_habitos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jugador_habitos_updated_at ON jugador_habitos;
CREATE TRIGGER trg_jugador_habitos_updated_at
    BEFORE UPDATE ON jugador_habitos
    FOR EACH ROW
    EXECUTE FUNCTION update_jugador_habitos_updated_at();

COMMENT ON TABLE jugador_habitos IS
  'Hábitos e información general del futbolista (sigue al jugador entre plantillas).';
COMMENT ON TABLE tratamiento_diario IS
  'Cuaderno diario de readaptación: trabajo, margen, feedback, nutrición.';

NOTIFY pgrst, 'reload schema';
