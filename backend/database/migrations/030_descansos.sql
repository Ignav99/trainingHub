-- 030: Descansos (rest days) table
-- Persists coach-marked rest days per team per date.

CREATE TABLE IF NOT EXISTS descansos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'descanso' CHECK (tipo IN ('descanso', 'festivo')),
    notas TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_descansos_equipo_fecha ON descansos(equipo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_descansos_fecha ON descansos(fecha);

ALTER TABLE descansos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON descansos FOR ALL USING (true) WITH CHECK (true);
