-- ============================================
-- TrainingHub Pro - Nutrition Module Tables
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Player nutritional profiles (one per player per team)
CREATE TABLE IF NOT EXISTS perfiles_nutricionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  peso_kg DECIMAL(5,2),
  altura_cm DECIMAL(5,2),
  porcentaje_grasa DECIMAL(5,2),
  masa_muscular_kg DECIMAL(5,2),
  metabolismo_basal_kcal INTEGER,
  objetivo TEXT CHECK (objetivo IN ('mantenimiento', 'ganancia_muscular', 'perdida_grasa', 'rendimiento', 'recuperacion')),
  alergias TEXT[],
  intolerancias TEXT[],
  preferencias_dieta TEXT,
  notas TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(jugador_id, equipo_id)
);

-- 2. Reusable meal templates (created by nutritionist)
CREATE TABLE IF NOT EXISTS plantillas_nutricionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo_comida TEXT NOT NULL CHECK (tipo_comida IN ('desayuno', 'almuerzo', 'comida', 'merienda', 'cena', 'snack_pre', 'snack_post')),
  contexto TEXT CHECK (contexto IN ('dia_normal', 'pre_partido', 'post_partido', 'dia_descanso', 'viaje', 'cualquiera')),
  descripcion TEXT,
  alimentos JSONB NOT NULL DEFAULT '[]',
  calorias_total INTEGER,
  proteinas_total_g DECIMAL(6,2),
  carbohidratos_total_g DECIMAL(6,2),
  grasas_total_g DECIMAL(6,2),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily nutrition plans (assigned to player or entire team for a date)
CREATE TABLE IF NOT EXISTS planes_nutricionales_dia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  contexto TEXT CHECK (contexto IN ('dia_normal', 'pre_partido', 'post_partido', 'dia_descanso', 'viaje')),
  comidas JSONB NOT NULL DEFAULT '[]',
  calorias_objetivo INTEGER,
  proteinas_objetivo_g DECIMAL(6,2),
  carbohidratos_objetivo_g DECIMAL(6,2),
  grasas_objetivo_g DECIMAL(6,2),
  hidratacion_litros DECIMAL(4,2),
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Player supplement tracking
CREATE TABLE IF NOT EXISTS suplementacion_jugador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  dosis TEXT,
  frecuencia TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Body composition history (periodic measurements)
CREATE TABLE IF NOT EXISTS composicion_corporal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  peso_kg DECIMAL(5,2) NOT NULL,
  porcentaje_grasa DECIMAL(5,2),
  masa_muscular_kg DECIMAL(5,2),
  imc DECIMAL(4,2),
  agua_corporal_pct DECIMAL(5,2),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS Policies (enable Row Level Security)
-- ============================================

ALTER TABLE perfiles_nutricionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_nutricionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_nutricionales_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE suplementacion_jugador ENABLE ROW LEVEL SECURITY;
ALTER TABLE composicion_corporal ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses service_role_key)
CREATE POLICY "service_role_full_access" ON perfiles_nutricionales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON plantillas_nutricionales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON planes_nutricionales_dia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON suplementacion_jugador FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON composicion_corporal FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_perfiles_nutricionales_jugador ON perfiles_nutricionales(jugador_id, equipo_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_nutricionales_equipo ON plantillas_nutricionales(equipo_id);
CREATE INDEX IF NOT EXISTS idx_planes_nutricionales_dia_equipo_fecha ON planes_nutricionales_dia(equipo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_planes_nutricionales_dia_jugador ON planes_nutricionales_dia(jugador_id, fecha);
CREATE INDEX IF NOT EXISTS idx_suplementacion_jugador_jugador ON suplementacion_jugador(jugador_id, equipo_id);
CREATE INDEX IF NOT EXISTS idx_composicion_corporal_jugador ON composicion_corporal(jugador_id, fecha DESC);
