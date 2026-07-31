-- 073_equipaciones.sql
-- Equipacion (kit) editable para un rival o para el club (organizacion).
-- Nunca ambos a la vez -- ver constraint equipaciones_un_solo_dueno.

CREATE TABLE IF NOT EXISTS equipaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rival_id UUID REFERENCES rivales(id) ON DELETE CASCADE,
    organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL DEFAULT 'local' CHECK (tipo IN ('local', 'visitante')),
    color_camiseta_principal VARCHAR(7) NOT NULL DEFAULT '#1a365d',
    color_camiseta_secundario VARCHAR(7),
    patron_camiseta VARCHAR(30) NOT NULL DEFAULT 'solido' CHECK (
        patron_camiseta IN ('solido', 'rayas_verticales', 'franjas_horizontales', 'mangas_diferentes', 'degradado')
    ),
    color_pantalon VARCHAR(7) NOT NULL DEFAULT '#1a365d',
    color_medias VARCHAR(7) NOT NULL DEFAULT '#1a365d',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT equipaciones_un_solo_dueno CHECK (
        (rival_id IS NOT NULL AND organizacion_id IS NULL) OR
        (rival_id IS NULL AND organizacion_id IS NOT NULL)
    ),
    UNIQUE (rival_id, tipo),
    UNIQUE (organizacion_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_equipaciones_rival ON equipaciones(rival_id) WHERE rival_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipaciones_organizacion ON equipaciones(organizacion_id) WHERE organizacion_id IS NOT NULL;

ALTER TABLE equipaciones ENABLE ROW LEVEL SECURITY;
