-- 022_competition_management.sql
-- Sistema de competiciones: mi_equipo, auto-link partidos, perfil rival

-- Campo para identificar "soy este equipo" en la clasificación RFAF
ALTER TABLE rfef_competiciones ADD COLUMN IF NOT EXISTS mi_equipo_nombre TEXT;

-- Campos para vincular partidos con competiciones RFAF
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS rfef_competicion_id UUID REFERENCES rfef_competiciones(id) ON DELETE SET NULL;
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS auto_creado BOOLEAN DEFAULT false;
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS ubicacion TEXT;

-- Campos para vincular rivales con nombres RFAF
ALTER TABLE rivales ADD COLUMN IF NOT EXISTS rfef_nombre TEXT;
ALTER TABLE rivales ADD COLUMN IF NOT EXISTS sistema_juego VARCHAR(20);
ALTER TABLE rivales ADD COLUMN IF NOT EXISTS estilo VARCHAR(50);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_partidos_rfef_comp ON partidos(rfef_competicion_id);
CREATE INDEX IF NOT EXISTS idx_rivales_rfef_nombre ON rivales(rfef_nombre);
