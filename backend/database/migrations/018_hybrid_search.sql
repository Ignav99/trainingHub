-- ============================================
-- Migration 018: Hybrid Search (Vector + Text + RRF)
-- ============================================
-- Adds hybrid search function combining pgvector cosine similarity
-- with pg_trgm trigram text matching using Reciprocal Rank Fusion.
-- Also upgrades IVFFlat index to HNSW for better small-dataset performance.

-- 1. Ensure pg_trgm extension is available
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add trigram index on chunks_kb.contenido for fast text search
CREATE INDEX IF NOT EXISTS idx_chunks_kb_contenido_trgm
  ON chunks_kb USING gin (contenido gin_trgm_ops);

-- 3. Upgrade embedding index from IVFFlat to HNSW (better for <100k rows)
DROP INDEX IF EXISTS idx_chunks_kb_embedding;
CREATE INDEX IF NOT EXISTS idx_chunks_kb_embedding_hnsw
  ON chunks_kb USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Hybrid search function with Reciprocal Rank Fusion
CREATE OR REPLACE FUNCTION hybrid_search_kb(
    p_query_text text,
    p_query_embedding vector(1536),
    p_match_count int DEFAULT 10,
    p_filter_doc_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    documento_id uuid,
    contenido text,
    posicion int,
    metadata jsonb,
    created_at timestamptz,
    vector_rank int,
    text_rank int,
    rrf_score float
)
LANGUAGE plpgsql
AS $$
DECLARE
    k_rrf CONSTANT int := 60;  -- RRF smoothing constant
    vector_weight CONSTANT float := 0.7;
    text_weight CONSTANT float := 0.3;
BEGIN
    RETURN QUERY
    WITH
    -- Vector similarity search (top candidates by cosine distance)
    vector_results AS (
        SELECT
            c.id,
            c.documento_id,
            c.contenido,
            c.posicion,
            c.metadata,
            c.created_at,
            ROW_NUMBER() OVER (ORDER BY c.embedding <=> p_query_embedding) AS rank_pos
        FROM chunks_kb c
        WHERE
            c.embedding IS NOT NULL
            AND (p_filter_doc_ids IS NULL OR c.documento_id = ANY(p_filter_doc_ids))
        ORDER BY c.embedding <=> p_query_embedding
        LIMIT p_match_count * 3  -- Fetch more candidates for fusion
    ),
    -- Trigram text similarity search
    text_results AS (
        SELECT
            c.id,
            c.documento_id,
            c.contenido,
            c.posicion,
            c.metadata,
            c.created_at,
            ROW_NUMBER() OVER (ORDER BY similarity(c.contenido, p_query_text) DESC) AS rank_pos
        FROM chunks_kb c
        WHERE
            (p_filter_doc_ids IS NULL OR c.documento_id = ANY(p_filter_doc_ids))
            AND (
                c.contenido % p_query_text  -- trigram similarity threshold
                OR c.contenido ILIKE '%' || p_query_text || '%'  -- exact substring fallback
            )
        ORDER BY similarity(c.contenido, p_query_text) DESC
        LIMIT p_match_count * 3
    ),
    -- Combine with Reciprocal Rank Fusion
    combined AS (
        SELECT
            COALESCE(v.id, t.id) AS id,
            COALESCE(v.documento_id, t.documento_id) AS documento_id,
            COALESCE(v.contenido, t.contenido) AS contenido,
            COALESCE(v.posicion, t.posicion) AS posicion,
            COALESCE(v.metadata, t.metadata) AS metadata,
            COALESCE(v.created_at, t.created_at) AS created_at,
            v.rank_pos AS vector_rank,
            t.rank_pos AS text_rank,
            -- RRF formula: score = w1/(k+rank1) + w2/(k+rank2)
            COALESCE(vector_weight / (k_rrf + v.rank_pos), 0) +
            COALESCE(text_weight / (k_rrf + t.rank_pos), 0) AS rrf_score
        FROM vector_results v
        FULL OUTER JOIN text_results t ON v.id = t.id
    )
    SELECT
        combined.id,
        combined.documento_id,
        combined.contenido,
        combined.posicion,
        combined.metadata,
        combined.created_at,
        combined.vector_rank::int,
        combined.text_rank::int,
        combined.rrf_score
    FROM combined
    WHERE combined.rrf_score > 0.005  -- Filter low-quality results
    ORDER BY combined.rrf_score DESC
    LIMIT p_match_count;
END;
$$;

-- 5. Add relevance tracking columns for future learning (Phase 4)
ALTER TABLE chunks_kb ADD COLUMN IF NOT EXISTS relevance_score DECIMAL(5,2) DEFAULT 1.0;
ALTER TABLE chunks_kb ADD COLUMN IF NOT EXISTS veces_citado INTEGER DEFAULT 0;
