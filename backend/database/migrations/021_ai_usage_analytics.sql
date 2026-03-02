-- ============================================
-- Migration 021: AI Usage Analytics
-- ============================================
-- Adds cache token tracking to ai_mensajes and
-- creates a monthly usage summary view for cost analysis.

-- 1. Add cache token fields to ai_mensajes (currently only logged, not persisted)
ALTER TABLE ai_mensajes ADD COLUMN IF NOT EXISTS cache_read_input_tokens INTEGER DEFAULT 0;
ALTER TABLE ai_mensajes ADD COLUMN IF NOT EXISTS cache_creation_input_tokens INTEGER DEFAULT 0;
ALTER TABLE ai_mensajes ADD COLUMN IF NOT EXISTS modelo VARCHAR(50);

-- 2. Index for monthly aggregation queries
CREATE INDEX IF NOT EXISTS idx_ai_mensajes_created_at ON ai_mensajes (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_mensajes_conversacion_rol
  ON ai_mensajes (conversacion_id, rol) WHERE rol = 'assistant';

-- 3. Index for org-level usage queries via conversacion -> usuario -> org
CREATE INDEX IF NOT EXISTS idx_ai_conversaciones_usuario ON ai_conversaciones (usuario_id);

-- 4. View: monthly AI usage per organization (for analytics endpoint)
CREATE OR REPLACE VIEW v_ai_usage_monthly AS
SELECT
    o.id AS organizacion_id,
    o.nombre AS organizacion_nombre,
    date_trunc('month', m.created_at) AS mes,

    -- Call counts
    COUNT(DISTINCT c.id) AS conversaciones,
    COUNT(*) FILTER (WHERE m.rol = 'user') AS mensajes_usuario,
    COUNT(*) FILTER (WHERE m.rol = 'assistant') AS mensajes_assistant,

    -- Token totals (only assistant messages have token counts)
    COALESCE(SUM(m.tokens_input) FILTER (WHERE m.rol = 'assistant'), 0) AS total_input_tokens,
    COALESCE(SUM(m.tokens_output) FILTER (WHERE m.rol = 'assistant'), 0) AS total_output_tokens,
    COALESCE(SUM(m.cache_read_input_tokens) FILTER (WHERE m.rol = 'assistant'), 0) AS total_cache_read_tokens,
    COALESCE(SUM(m.cache_creation_input_tokens) FILTER (WHERE m.rol = 'assistant'), 0) AS total_cache_creation_tokens,

    -- Tool usage
    COUNT(*) FILTER (
        WHERE m.rol = 'assistant'
        AND m.herramientas_usadas IS NOT NULL
        AND jsonb_array_length(m.herramientas_usadas) > 0
    ) AS mensajes_con_tools,

    -- Feedback
    COUNT(*) FILTER (WHERE m.feedback = 'positivo') AS feedback_positivo,
    COUNT(*) FILTER (WHERE m.feedback = 'negativo') AS feedback_negativo,

    -- Averages per assistant message
    ROUND(AVG(m.tokens_input) FILTER (WHERE m.rol = 'assistant')) AS avg_input_tokens,
    ROUND(AVG(m.tokens_output) FILTER (WHERE m.rol = 'assistant')) AS avg_output_tokens

FROM ai_mensajes m
JOIN ai_conversaciones c ON c.id = m.conversacion_id
JOIN usuarios u ON u.id = c.usuario_id
JOIN organizaciones o ON o.id = u.organizacion_id
GROUP BY o.id, o.nombre, date_trunc('month', m.created_at);
