import { db } from "@/lib/db";
import { normalizeName, normalizeZip } from "@/lib/normalize";

export interface FuzzyMatch {
  id: string;
  normalizedName: string;
  similarity: number;
}

/**
 * Fuzzy lookup via pg_trgm: an existing Lead in the same ZIP whose
 * normalizedName is > threshold similar. Used when there's no exact dedupeKey
 * hit, so we attach a new LeadSource instead of creating a duplicate Lead.
 *
 * Requires the GIN trigram index from prisma/sql/001_pg_trgm.sql.
 */
export async function findFuzzyMatch(
  name: string,
  zip: string | null | undefined,
  threshold = 0.6,
): Promise<FuzzyMatch | null> {
  const normalized = normalizeName(name);
  const z = normalizeZip(zip);
  if (!normalized || !z) return null;

  const rows = await db.$queryRaw<FuzzyMatch[]>`
    SELECT id,
           "normalizedName",
           similarity("normalizedName", ${normalized}) AS similarity
    FROM "Lead"
    WHERE "zip" = ${z}
      AND similarity("normalizedName", ${normalized}) > ${threshold}
    ORDER BY similarity DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}
