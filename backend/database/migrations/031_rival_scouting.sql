-- 031_rival_scouting.sql
-- Rival-level intel cache + versioned AI reports per rival

-- Rival-level intel cache (same PreMatchIntel format as partidos.pre_match_intel)
ALTER TABLE rivales ADD COLUMN IF NOT EXISTS rival_intel JSONB DEFAULT NULL;

-- Versioned AI reports per rival
CREATE TABLE IF NOT EXISTS rival_informes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rival_id UUID NOT NULL REFERENCES rivales(id) ON DELETE CASCADE,
    organizacion_id UUID NOT NULL,
    partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL DEFAULT 'informe' CHECK (tipo IN ('informe', 'plan')),
    contenido JSONB NOT NULL,
    conversacion JSONB DEFAULT '[]',
    intel_snapshot JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rival_informes_rival ON rival_informes(rival_id);
CREATE INDEX IF NOT EXISTS idx_rival_informes_partido ON rival_informes(partido_id);

ALTER TABLE rival_informes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON rival_informes FOR ALL USING (true) WITH CHECK (true);
