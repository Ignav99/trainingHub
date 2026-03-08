-- 027_carga_acumulada.sql
-- Tabla materializada de carga acumulada por jugador (rolling load + wellness)

CREATE TABLE IF NOT EXISTS carga_acumulada_jugador (
    jugador_id UUID PRIMARY KEY REFERENCES jugadores(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    carga_aguda NUMERIC(8,2) DEFAULT 0,          -- 7-day total (acute load)
    carga_cronica NUMERIC(8,2) DEFAULT 0,         -- 28-day avg weekly (chronic load)
    ratio_acwr NUMERIC(6,3),                      -- Acute:Chronic Workload Ratio
    nivel_carga TEXT DEFAULT 'optimo' CHECK (nivel_carga IN ('bajo', 'optimo', 'alto', 'critico')),
    ultima_carga NUMERIC(8,2) DEFAULT 0,
    ultima_actividad_fecha DATE,
    dias_sin_actividad INTEGER DEFAULT 0,
    wellness_valor INTEGER CHECK (wellness_valor BETWEEN 1 AND 10),
    wellness_fecha DATE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carga_acum_equipo ON carga_acumulada_jugador(equipo_id);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_carga_acumulada_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_carga_acumulada_updated_at ON carga_acumulada_jugador;
CREATE TRIGGER trigger_carga_acumulada_updated_at
    BEFORE UPDATE ON carga_acumulada_jugador
    FOR EACH ROW
    EXECUTE FUNCTION update_carga_acumulada_updated_at();

-- Enable RLS
ALTER TABLE carga_acumulada_jugador ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can read/write through service role (backend handles auth)
CREATE POLICY "service_role_all" ON carga_acumulada_jugador
    FOR ALL
    USING (true)
    WITH CHECK (true);
