CREATE TABLE IF NOT EXISTS game_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  created_by UUID REFERENCES usuarios(id),
  nombre TEXT NOT NULL DEFAULT 'Modelo de Juego',
  sistema_juego TEXT,
  estilo TEXT,
  descripcion_general TEXT,
  principios_ataque_organizado JSONB DEFAULT '[]',
  principios_defensa_organizada JSONB DEFAULT '[]',
  principios_transicion_of JSONB DEFAULT '[]',
  principios_transicion_def JSONB DEFAULT '[]',
  principios_balon_parado JSONB DEFAULT '[]',
  subprincipios JSONB DEFAULT '{}',
  roles_posicionales JSONB DEFAULT '{}',
  pressing_tipo TEXT,
  salida_balon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_models_equipo ON game_models(equipo_id);
ALTER TABLE game_models ENABLE ROW LEVEL SECURITY;
