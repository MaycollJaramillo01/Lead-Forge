import { db } from "@/lib/db";
import { computePainScore } from "@/lib/scoring";
import { getZbpDensity } from "@/lib/providers/census";
import { getIndustry } from "@/lib/industry/map";
import { inngest } from "../client";

/**
 * lead/audited -> score (pain score) -> LeadScore.
 * Emits lead/scored; hot leads trigger enrichment downstream.
 */
export const score = inngest.createFunction(
  { id: "score", name: "Score lead", concurrency: { limit: 10 }, retries: 2 },
  { event: "lead/audited" },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const data = await step.run("load", async () => {
      const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
      const audit = await db.leadAudit.findFirst({
        where: { leadId },
        orderBy: { auditedAt: "desc" },
      });
      return { lead, audit };
    });

    const density = await step.run("census-density", async () => {
      const industry = getIndustry(data.lead.industry ?? "");
      if (!industry?.naics || !data.lead.zip) return { estabCount: null };
      return getZbpDensity(data.lead.zip, industry.naics);
    });

    const tech = (data.audit?.techStack ?? {}) as Record<string, unknown>;
    const result = computePainScore({
      hasWebsite: data.audit?.hasWebsite ?? false,
      perfScore: data.audit?.perfScore ?? null,
      isMobileFriendly: data.audit?.isMobileFriendly ?? null,
      hasHttps: data.audit?.hasHttps ?? null,
      cheapBuilder: (tech.cheapBuilder as boolean | undefined) ?? null,
      lcpMs: data.audit?.lcpMs ?? null,
      inCrux: data.audit?.inCrux ?? null,
      highCompetition: density.estabCount != null && density.estabCount > 15,
      businessStatus: data.lead.businessStatus,
    });

    await step.run("save-score", async () => {
      await db.leadScore.create({
        data: {
          leadId,
          painScore: result.painScore,
          scoreBreakdown: result.scoreBreakdown,
          priority: result.priority,
        },
      });
      await db.lead.update({ where: { id: leadId }, data: { status: "scored" } });
    });

    await step.sendEvent("emit-scored", {
      name: "lead/scored",
      data: { leadId, priority: result.priority },
    });

    return result;
  },
);
