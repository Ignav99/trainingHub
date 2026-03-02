-- ============================================
-- Migration 019: AI Feedback System
-- ============================================
-- Adds feedback column to AI messages for learning loop.
-- Tracks which chunks are most cited/relevant.

-- 1. Add feedback column to ai_mensajes
ALTER TABLE ai_mensajes
  ADD COLUMN IF NOT EXISTS feedback VARCHAR(10)
    CHECK (feedback IN ('positivo', 'negativo'));

-- 2. Index for quick feedback analytics
CREATE INDEX IF NOT EXISTS idx_ai_mensajes_feedback
  ON ai_mensajes (feedback) WHERE feedback IS NOT NULL;

-- Note: relevance_score and veces_citado on chunks_kb
-- are already added in migration 018_hybrid_search.sql
