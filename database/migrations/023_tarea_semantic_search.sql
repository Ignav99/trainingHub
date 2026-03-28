-- ============================================
-- Migration 023: Tarea Semantic Search (Vector + Text + RRF)
-- ============================================
-- Adds embedding column to tareas table, HNSW index, trigram indexes,
-- and hybrid_search_tareas RPC function for AI-powered task search.

-- 1. Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add embedding column to tareas
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. HNSW index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_tareas_embedding_hnsw
  ON tareas USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Trigram indexes on titulo and descripcion for text fallback
CREATE INDEX IF NOT EXISTS idx_tareas_titulo_trgm
  ON tareas USING gin (titulo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tareas_descripcion_trgm
  ON tareas USING gin (descripcion gin_trgm_ops);

-- 5. Hybrid search function with Reciprocal Rank Fusion
CREATE OR REPLACE FUNCTION hybrid_search_tareas(
    p_query_text text,
    p_query_embedding vector(1536),
    p_organizacion_id uuid,
    p_match_count int DEFAULT 15,
    p_categoria_codigo text DEFAULT NULL,
    p_fase_juego text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    titulo text,
    descripcion text,
    categoria_codigo text,
    categoria_nombre text,
    duracion_total int,
    num_jugadores_min int,
    num_jugadores_max int,
    num_porteros int,
    densidad text,
    nivel_cognitivo int,
    fase_juego text,
    principio_tactico text,
    estructura_equipos text,
    num_usos int,
    rrf_score float,
    relevance_pct int
)
LANGUAGE plpgsql
AS $$
DECLARE
    k_rrf CONSTANT int := 60;
    vector_weight CONSTANT float := 0.7;
    text_weight CONSTANT float := 0.3;
    max_score float;
BEGIN
    RETURN QUERY
    WITH
    -- Vector similarity search
    vector_results AS (
        SELECT
            t.id,
            ROW_NUMBER() OVER (ORDER BY t.embedding <=> p_query_embedding) AS rank_pos
        FROM tareas t
        LEFT JOIN categorias_tarea ct ON ct.id = t.categoria_id
        WHERE
            t.embedding IS NOT NULL
            AND t.organizacion_id = p_organizacion_id
            AND (p_categoria_codigo IS NULL OR ct.codigo = p_categoria_codigo)
            AND (p_fase_juego IS NULL OR t.fase_juego = p_fase_juego)
        ORDER BY t.embedding <=> p_query_embedding
        LIMIT p_match_count * 3
    ),
    -- Trigram text similarity search (on titulo + descripcion)
    text_results AS (
        SELECT
            t.id,
            ROW_NUMBER() OVER (
                ORDER BY GREATEST(
                    similarity(t.titulo, p_query_text),
                    similarity(COALESCE(t.descripcion, ''), p_query_text)
                ) DESC
            ) AS rank_pos
        FROM tareas t
        LEFT JOIN categorias_tarea ct ON ct.id = t.categoria_id
        WHERE
            t.organizacion_id = p_organizacion_id
            AND (p_categoria_codigo IS NULL OR ct.codigo = p_categoria_codigo)
            AND (p_fase_juego IS NULL OR t.fase_juego = p_fase_juego)
            AND (
                t.titulo % p_query_text
                OR COALESCE(t.descripcion, '') % p_query_text
                OR t.titulo ILIKE '%' || p_query_text || '%'
                OR COALESCE(t.descripcion, '') ILIKE '%' || p_query_text || '%'
            )
        ORDER BY GREATEST(
            similarity(t.titulo, p_query_text),
            similarity(COALESCE(t.descripcion, ''), p_query_text)
        ) DESC
        LIMIT p_match_count * 3
    ),
    -- Combine with Reciprocal Rank Fusion
    combined AS (
        SELECT
            COALESCE(v.id, tx.id) AS id,
            COALESCE(vector_weight / (k_rrf + v.rank_pos), 0) +
            COALESCE(text_weight / (k_rrf + tx.rank_pos), 0) AS rrf_score
        FROM vector_results v
        FULL OUTER JOIN text_results tx ON v.id = tx.id
    ),
    -- Get max score for normalization
    score_range AS (
        SELECT MAX(c.rrf_score) AS max_s FROM combined c
    )
    SELECT
        t.id,
        t.titulo,
        t.descripcion,
        ct.codigo AS categoria_codigo,
        ct.nombre AS categoria_nombre,
        t.duracion_total,
        t.num_jugadores_min,
        t.num_jugadores_max,
        t.num_porteros,
        t.densidad,
        t.nivel_cognitivo,
        t.fase_juego,
        t.principio_tactico,
        t.estructura_equipos,
        t.num_usos,
        c.rrf_score,
        -- Normalize to 0-100 percentage
        CASE
            WHEN sr.max_s > 0 THEN LEAST(100, ROUND((c.rrf_score / sr.max_s) * 100)::int)
            ELSE 0
        END AS relevance_pct
    FROM combined c
    JOIN tareas t ON t.id = c.id
    LEFT JOIN categorias_tarea ct ON ct.id = t.categoria_id
    CROSS JOIN score_range sr
    WHERE c.rrf_score > 0.003
    ORDER BY c.rrf_score DESC
    LIMIT p_match_count;
END;
$$;
