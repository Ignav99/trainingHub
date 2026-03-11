-- 032_carga_diaria.sql
-- Daily load history per player for EWMA-based load tracking and charts.

-- New daily history table
CREATE TABLE IF NOT EXISTS carga_diaria_jugador (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    load_sesion NUMERIC(8,2) DEFAULT 0,
    load_partido NUMERIC(8,2) DEFAULT 0,
    load_manual NUMERIC(8,2) DEFAULT 0,
    load_total NUMERIC(8,2) DEFAULT 0,
    ewma_acute NUMERIC(8,2) DEFAULT 0,
    ewma_chronic NUMERIC(8,2) DEFAULT 0,
    acwr NUMERIC(6,3),
    monotonia NUMERIC(6,3),
    strain NUMERIC(10,2),
    UNIQUE (jugador_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_carga_diaria_equipo ON carga_diaria_jugador(equipo_id);
CREATE INDEX IF NOT EXISTS idx_carga_diaria_fecha ON carga_diaria_jugador(jugador_id, fecha);

-- Extend snapshot table with monotonia/strain
ALTER TABLE carga_acumulada_jugador ADD COLUMN IF NOT EXISTS monotonia NUMERIC(6,3);
ALTER TABLE carga_acumulada_jugador ADD COLUMN IF NOT EXISTS strain NUMERIC(10,2);

-- Enable RLS
ALTER TABLE carga_diaria_jugador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON carga_diaria_jugador
    FOR ALL
    USING (true)
    WITH CHECK (true);
