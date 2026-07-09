-- FASE 1 fix: Añadir relaciones faltantes en microciclos para rival y modelo de juego
-- Estas FK son necesarias para que PostgREST exponga las relaciones y los joins
-- de los endpoints /v1/microciclos funcionen sin error 500.

ALTER TABLE microciclos
ADD COLUMN IF NOT EXISTS rival_id UUID REFERENCES rivales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS game_model_id UUID REFERENCES game_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_microciclos_rival_id ON microciclos(rival_id);
CREATE INDEX IF NOT EXISTS idx_microciclos_game_model_id ON microciclos(game_model_id);
