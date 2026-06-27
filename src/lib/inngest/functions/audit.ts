import { db } from "@/lib/db";
import { runAudit } from "@/lib/audit";
import { inngest } from "../client";

/**
 * lead/ready -> audit (Cheerio + PageSpeed + CrUX) -> LeadAudit.
 * Throttled to respect PageSpeed's ~200/min ceiling.
 */
export const audit = inngest.createFunction(
  {
    id: "audit",
    name: "Audit website",
    concurrency: { limit: 5 },
    throttle: { limit: 180, period: "1m" },
    retries: 2,
  },
  { event: "lead/ready" },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const lead = await step.run("load-lead", async () =>
      db.lead.findUniqueOrThrow({ where: { id: leadId } }),
    );

    const result = await step.run("run-audit", async () => runAudit(lead.website));

    await step.run("save-audit", async () => {
      await db.leadAudit.create({
        data: {
          leadId,
          hasWebsite: result.hasWebsite,
          httpStatus: result.httpStatus,
          hasHttps: result.hasHttps,
          isMobileFriendly: result.isMobileFriendly,
          perfScore: result.perfScore,
          seoScore: result.seoScore,
          accessibilityScore: result.accessibilityScore,
          lcpMs: result.lcpMs,
          cls: result.cls,
          inpMs: result.inpMs,
          inCrux: result.inCrux,
          techStack: result.techStack as object,
          auditSource: result.auditSource,
        },
      });
      await db.lead.update({ where: { id: leadId }, data: { status: "audited" } });
    });

    await step.sendEvent("emit-audited", {
      name: "lead/audited",
      data: { leadId },
    });

    return { hasWebsite: result.hasWebsite, perfScore: result.perfScore };
  },
);
