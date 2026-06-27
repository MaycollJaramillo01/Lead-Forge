import { db } from "@/lib/db";
import { findFuzzyMatch } from "@/lib/dedupe";
import {
  buildDedupeKey,
  normalizeName,
  normalizePhone,
  normalizeWebsite,
  normalizeZip,
} from "@/lib/normalize";
import type { NormalizedLead } from "@/lib/providers/types";
import { inngest } from "../client";

/**
 * lead/discovered -> normalize + dedupe -> upsert Lead + LeadSource.
 * Exact match on dedupeKey, else pg_trgm fuzzy match in same ZIP. Either way a
 * LeadSource row is attached for legal traceability. Emits lead/ready per lead.
 */
export const normalizeDedupe = inngest.createFunction(
  { id: "normalize-dedupe", name: "Normalize & dedupe", concurrency: { limit: 5 }, retries: 3 },
  { event: "lead/discovered" },
  async ({ event, step }) => {
    const { campaignId, leads } = event.data;

    const leadIds = await step.run("upsert-leads", async () => {
      const ids: string[] = [];
      for (const raw of leads as NormalizedLead[]) {
        const id = await upsertOne(raw);
        if (id) ids.push(id);
      }
      return ids;
    });

    for (const leadId of leadIds) {
      await step.sendEvent(`ready-${leadId}`, {
        name: "lead/ready",
        data: { leadId, campaignId },
      });
    }

    return { upserted: leadIds.length };
  },
);

async function upsertOne(raw: NormalizedLead): Promise<string | null> {
  const businessName = raw.business_name.trim();
  if (!businessName) return null;

  const normalizedName = normalizeName(businessName);
  const zip = normalizeZip(raw.zip);
  const phone = normalizePhone(raw.phone);
  const website = normalizeWebsite(raw.website);
  const dedupeKey = buildDedupeKey(businessName, zip, phone);

  // 1) exact dedupeKey
  let lead = await db.lead.findUnique({ where: { dedupeKey } });

  // 2) fuzzy (same ZIP, trigram similarity > 0.6)
  if (!lead) {
    const fuzzy = await findFuzzyMatch(businessName, zip);
    if (fuzzy) lead = await db.lead.findUnique({ where: { id: fuzzy.id } });
  }

  if (!lead) {
    lead = await db.lead.create({
      data: {
        businessName,
        normalizedName,
        industry: raw.industry,
        categoryId: raw.industry, // Category.id === industry slug (see seed)
        address: raw.address || null,
        city: raw.city || null,
        state: raw.state || null,
        zip: zip || null,
        phone: phone || null,
        website: website || null,
        email: raw.email || null,
        latitude: raw.latitude ? Number(raw.latitude) : null,
        longitude: raw.longitude ? Number(raw.longitude) : null,
        businessStatus: "operational",
        dedupeKey,
        status: "new",
      },
    });
  } else {
    // Backfill missing contact fields from a second source.
    await db.lead.update({
      where: { id: lead.id },
      data: {
        phone: lead.phone ?? (phone || null),
        website: lead.website ?? (website || null),
        email: lead.email ?? (raw.email || null),
      },
    });
  }

  // Always attach the source (traceability). Unique on (source, sourceId).
  await db.leadSource.upsert({
    where: { source_sourceId: { source: raw.source, sourceId: raw.source_id } },
    update: { rawTags: raw.raw_tags as object, leadId: lead.id },
    create: {
      leadId: lead.id,
      source: raw.source,
      sourceId: raw.source_id,
      rawTags: raw.raw_tags as object,
      sourceUrl:
        raw.source === "openstreetmap"
          ? `https://www.openstreetmap.org/${raw.source_id}`
          : null,
    },
  });

  return lead.id;
}
