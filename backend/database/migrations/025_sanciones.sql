-- 025: Sanciones oficiales RFAF
-- Adds sancion config columns to rfef_competiciones and creates rfef_sanciones table

-- Columns for mapping sanciones competition/group IDs (different from clasificacion IDs)
ALTER TABLE rfef_competiciones
  ADD COLUMN IF NOT EXISTS sancion_competicion_id TEXT,
  ADD COLUMN IF NOT EXISTS sancion_grupo_id TEXT;

-- Official sanctions table
CREATE TABLE IF NOT EXISTS rfef_sanciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competicion_id UUID NOT NULL REFERENCES rfef_competiciones(id) ON DELETE CASCADE,
    jornada_numero INTEGER NOT NULL,
    jornada_fecha DATE,
    reunion_fecha DATE,
    categoria TEXT NOT NULL,           -- 'jugador' | 'tecnico' | 'equipo'
    equipo_nombre TEXT NOT NULL,
    persona_nombre TEXT DEFAULT '',     -- empty string for equipo-level
    tipo_licencia TEXT,
    articulo TEXT,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(competicion_id, jornada_numero, equipo_nombre, persona_nombre, articulo, descripcion)
);

CREATE INDEX IF NOT EXISTS idx_rfef_sanciones_comp ON rfef_sanciones(competicion_id);
CREATE INDEX IF NOT EXISTS idx_rfef_sanciones_jornada ON rfef_sanciones(competicion_id, jornada_numero);
CREATE INDEX IF NOT EXISTS idx_rfef_sanciones_equipo ON rfef_sanciones(equipo_nombre);
