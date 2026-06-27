import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { leadsQuerySchema } from "@/lib/validation";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = leadsQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const q = parsed.data;

  const where: Prisma.LeadWhereInput = {};
  if (q.state) where.state = q.state;
  if (q.zip) where.zip = q.zip;
  if (q.industry) where.industry = q.industry;

  const leads = await db.lead.findMany({
    where,
    take: q.take,
    skip: q.skip,
    orderBy: { createdAt: "desc" },
    include: {
      scores: { orderBy: { scoredAt: "desc" }, take: 1 },
      audits: { orderBy: { auditedAt: "desc" }, take: 1 },
    },
  });

  // priority / minScore filter against the latest score (post-query: scores are
  // 1:1-ish per lead and the dataset per page is small).
  const filtered = leads.filter((l) => {
    const s = l.scores[0];
    if (q.priority && s?.priority !== q.priority) return false;
    if (q.minScore != null && (s?.painScore ?? -1) < q.minScore) return false;
    return true;
  });

  const rows = filtered.map((l) => ({
    id: l.id,
    businessName: l.businessName,
    city: l.city,
    state: l.state,
    zip: l.zip,
    industry: l.industry,
    website: l.website,
    phone: l.phone,
    status: l.status,
    hasWebsite: l.audits[0]?.hasWebsite ?? null,
    perfScore: l.audits[0]?.perfScore ?? null,
    painScore: l.scores[0]?.painScore ?? null,
    priority: l.scores[0]?.priority ?? null,
  }));

  return NextResponse.json({ count: rows.length, leads: rows });
}
