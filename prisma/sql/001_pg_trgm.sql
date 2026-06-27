-- LeadForge — pg_trgm extension + GIN index for fuzzy dedupe.
-- Apply AFTER the initial Prisma migration:
--   psql "$DIRECT_URL" -f prisma/sql/001_pg_trgm.sql
-- (or paste into the Neon SQL editor).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN index used by src/lib/dedupe (similarity(normalizedName) > 0.6).
CREATE INDEX IF NOT EXISTS lead_normalizedname_trgm_idx
  ON "Lead" USING gin ("normalizedName" gin_trgm_ops);
