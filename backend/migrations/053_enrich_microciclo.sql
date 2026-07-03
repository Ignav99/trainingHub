-- ============================================
-- Enriquecer tabla microciclos
-- Nuevas columnas: rival_id, game_model_id
-- ============================================

ALTER TABLE microciclos
    ADD COLUMN IF NOT EXISTS rival_id UUID REFERENCES rivales(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS game_model_id UUID REFERENCES game_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_microciclos_rival ON microciclos(rival_id);
CREATE INDEX IF NOT EXISTS idx_microciclos_game_model ON microciclos(game_model_id);
