import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      sources: { orderBy: { capturedAt: "desc" } },
      audits: { orderBy: { auditedAt: "desc" } },
      scores: { orderBy: { scoredAt: "desc" } },
      enrichmentJobs: { orderBy: { createdAt: "desc" } },
      category: true,
    },
  });
  if (!lead) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ lead });
}
