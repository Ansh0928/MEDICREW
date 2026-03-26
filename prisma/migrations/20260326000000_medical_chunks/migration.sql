CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS medical_chunks (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  content     text    NOT NULL,
  embedding   vector(768),
  specialty   text,
  source      text
);

-- NOTE: Do NOT create the ivfflat index here.
-- Run scripts/embed-corpus.ts first, then create the index manually:
-- CREATE INDEX ON medical_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
-- (lists = 50 is appropriate for ~13k rows: sqrt(13000) ≈ 114, use 50 for safety at start)
