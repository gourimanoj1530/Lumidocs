-- ─────────────────────────────────────────────────────────
--  init.sql — Lumidocs platform schema
--  Run this once in pgAdmin against the `docdb` database
-- ─────────────────────────────────────────────────────────

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Documents ────────────────────────────────────────────
-- user_id is VARCHAR to hold Google's numeric sub ID
-- (e.g. "108879496764688791085") — not a UUID
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         VARCHAR(255) NOT NULL,
    filename        VARCHAR(500) NOT NULL,
    original_name   VARCHAR(500) NOT NULL,
    file_type       VARCHAR(50) NOT NULL,
    file_size       BIGINT,
    minio_bucket    VARCHAR(255) NOT NULL,
    minio_key       VARCHAR(500) NOT NULL,
    status          VARCHAR(50) DEFAULT 'uploaded',
    page_count      INTEGER,
    summary         TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Document chunks (for RAG) ─────────────────────────────
CREATE TABLE IF NOT EXISTS document_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    token_count     INTEGER,
    page_number     INTEGER,
    embedding       vector(3072),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_documents_user_id
    ON documents(user_id);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id
    ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding
    ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- ── Helpful view ──────────────────────────────────────────
CREATE OR REPLACE VIEW document_overview AS
    SELECT
        d.id,
        d.user_id,
        d.original_name,
        d.file_type,
        d.status,
        d.page_count,
        COUNT(dc.id) AS chunk_count,
        d.created_at
    FROM documents d
    LEFT JOIN document_chunks dc ON dc.document_id = d.id
    GROUP BY d.id;

SELECT 'Schema initialized successfully.' AS status;