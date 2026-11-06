-- Plan individualizado del futbolista: entradas del cuerpo técnico por área
-- (físico, técnico-táctico, emocional), con mediciones en el tiempo, plan de
-- trabajo, resolución y cortes de la biblioteca enlazados (el vídeo no se copia).
-- Idempotente.

CREATE TABLE IF NOT EXISTS plan_individual_entradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    area TEXT NOT NULL CHECK (area IN ('fisico', 'tecnico_tactico', 'emocional')),
    titulo TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 160),
    fecha DATE NOT NULL,
    descripcion TEXT,
    prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_trabajo', 'resuelta')),
    marcas TEXT[] NOT NULL DEFAULT '{}',
    plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    revisar_el DATE,
    resolucion_fecha DATE,
    resolucion_resultado TEXT CHECK (resolucion_resultado IN ('mejora', 'se_mantiene', 'empeora')),
    resolucion_texto TEXT,
    creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_individual_entradas_jugador
  ON plan_individual_entradas (jugador_id, area, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_plan_individual_entradas_equipo
  ON plan_individual_entradas (equipo_id, estado);

CREATE TABLE IF NOT EXISTS plan_individual_mediciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrada_id UUID NOT NULL REFERENCES plan_individual_entradas(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    momento TEXT NOT NULL DEFAULT 'seguimiento' CHECK (momento IN ('inicial', 'seguimiento', 'resolucion')),
    metrica TEXT NOT NULL CHECK (char_length(metrica) BETWEEN 1 AND 120),
    valor NUMERIC NOT NULL,
    total NUMERIC CHECK (total IS NULL OR total > 0),
    unidad TEXT,
    mejor TEXT NOT NULL DEFAULT 'mas' CHECK (mejor IN ('mas', 'menos')),
    notas TEXT,
    creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_individual_mediciones_entrada
  ON plan_individual_mediciones (entrada_id, metrica, fecha);

CREATE TABLE IF NOT EXISTS plan_individual_cortes (
    entrada_id UUID NOT NULL REFERENCES plan_individual_entradas(id) ON DELETE CASCADE,
    corte_id UUID NOT NULL REFERENCES biblioteca_cortes(id) ON DELETE CASCADE,
    nota TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entrada_id, corte_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_individual_cortes_corte
  ON plan_individual_cortes (corte_id);

-- Solo el backend (service role) lee y escribe: las notas emocionales no son para el jugador.
ALTER TABLE plan_individual_entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_individual_mediciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_individual_cortes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_plan_individual_entradas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_plan_individual_entradas_updated_at ON plan_individual_entradas;
CREATE TRIGGER trg_plan_individual_entradas_updated_at
    BEFORE UPDATE ON plan_individual_entradas
    FOR EACH ROW
    EXECUTE FUNCTION update_plan_individual_entradas_updated_at();

COMMENT ON TABLE plan_individual_entradas IS
  'Plan individualizado: observación datada del CT, plan de trabajo y resolución por área.';
