-- Migration 034: ABP Partido Plan
-- Plan de ABP para partido con comentarios ofensivo/defensivo del entrenador

CREATE TABLE IF NOT EXISTS abp_partido_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
    organizacion_id UUID NOT NULL,
    comentario_ofensivo TEXT,
    comentario_defensivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(partido_id)
);

CREATE INDEX IF NOT EXISTS idx_abp_partido_plan_partido ON abp_partido_plan(partido_id);
