-- ============================================
-- PLAN DE PARTIDO SYSTEM
-- Tablas: planes_partido, informes_rival, alertas
-- ============================================

-- 1. Planes de Partido
CREATE TABLE IF NOT EXISTS planes_partido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
    microciclo_id UUID NOT NULL REFERENCES microciclos(id) ON DELETE CASCADE,
    game_model_id UUID REFERENCES game_models(id) ON DELETE SET NULL,
    sistema_juego TEXT NOT NULL DEFAULT '4-3-3',
    estilo_previsto TEXT,
    once_inicial JSONB DEFAULT '{}'::jsonb,
    suplentes JSONB DEFAULT '[]'::jsonb,
    descartados JSONB DEFAULT '[]'::jsonb,
    capitan_id UUID REFERENCES jugadores(id) ON DELETE SET NULL,
    -- Fases tácticas (JSONB)
    fase_ataque_organizado JSONB,
    fase_defensa_organizada JSONB,
    fase_transicion_ofensiva JSONB,
    fase_transicion_defensiva JSONB,
    fase_abp_ofensivo JSONB,
    fase_abp_defensivo JSONB,
    -- Momentos y escenarios (JSONB arrays)
    momentos_partido JSONB DEFAULT '[]'::jsonb,
    escenarios JSONB DEFAULT '[]'::jsonb,
    -- Metadata
    estado TEXT NOT NULL DEFAULT 'borrador',
    notas TEXT,
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planes_partido_microciclo ON planes_partido(microciclo_id);
CREATE INDEX IF NOT EXISTS idx_planes_partido_partido ON planes_partido(partido_id);
CREATE INDEX IF NOT EXISTS idx_planes_partido_estado ON planes_partido(estado);

-- 2. Informes de Rival Enriquecidos
CREATE TABLE IF NOT EXISTS informes_rival (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rival_id UUID NOT NULL REFERENCES rivales(id) ON DELETE CASCADE,
    partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL,
    sistema_juego TEXT,
    sistema_variantes JSONB DEFAULT '[]'::jsonb,
    estilo TEXT,
    fortalezas JSONB DEFAULT '[]'::jsonb,
    debilidades JSONB DEFAULT '[]'::jsonb,
    jugadores_clave JSONB DEFAULT '[]'::jsonb,
    lesionados_sancionados JSONB DEFAULT '[]'::jsonb,
    ultimos_partidos JSONB DEFAULT '[]'::jsonb,
    abp_ofensivo TEXT,
    abp_defensivo TEXT,
    mapa_presion JSONB,
    notas TEXT,
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_informes_rival_rival ON informes_rival(rival_id);
CREATE INDEX IF NOT EXISTS idx_informes_rival_partido ON informes_rival(partido_id);

-- 3. Alertas
CREATE TABLE IF NOT EXISTS alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    microciclo_id UUID REFERENCES microciclos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    prioridad TEXT NOT NULL DEFAULT 'normal',
    titulo TEXT NOT NULL,
    mensaje TEXT,
    entidad_tipo TEXT,
    entidad_id UUID,
    accion_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    resuelta BOOLEAN NOT NULL DEFAULT false,
    resuelta_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    resuelta_en TIMESTAMPTZ,
    notas_resolucion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_equipo ON alertas(equipo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_microciclo ON alertas(microciclo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON alertas(tipo);
CREATE INDEX IF NOT EXISTS idx_alertas_resuelta ON alertas(resuelta);
CREATE INDEX IF NOT EXISTS idx_alertas_prioridad ON alertas(prioridad);
