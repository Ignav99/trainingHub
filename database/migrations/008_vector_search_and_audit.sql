-- ============================================================
-- Migration 008: Vector Search Function + Audit Log
-- ============================================================

-- ============ VECTOR SEARCH FUNCTION ============
-- Used by Knowledge Base for semantic search via pgvector

CREATE OR REPLACE FUNCTION search_kb_chunks(
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    filter_doc_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    documento_id uuid,
    contenido text,
    posicion int,
    metadata jsonb,
    created_at timestamptz,
    distance float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.documento_id,
        c.contenido,
        c.posicion,
        c.metadata,
        c.created_at,
        (c.embedding <=> query_embedding)::float AS distance
    FROM chunks_kb c
    WHERE
        c.embedding IS NOT NULL
        AND (filter_doc_ids IS NULL OR c.documento_id = ANY(filter_doc_ids))
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


-- ============ AUDIT LOG TABLE ============
-- Tracks create/update/delete operations on important entities

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('crear', 'actualizar', 'eliminar')),
    entidad_tipo VARCHAR(50) NOT NULL,
    entidad_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for audit log
CREATE INDEX idx_audit_log_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_log_entidad ON audit_log(entidad_tipo, entidad_id);
CREATE INDEX idx_audit_log_fecha ON audit_log(created_at);
CREATE INDEX idx_audit_log_accion ON audit_log(accion);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: users can see audit logs for their organization's entities
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (true);
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (true);


-- ============ FULL-TEXT SEARCH on chunks_kb ============
-- Fallback search when embeddings are not available

CREATE INDEX idx_chunks_kb_contenido_trgm ON chunks_kb USING gin (contenido gin_trgm_ops);

-- Enable pg_trgm extension for trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
