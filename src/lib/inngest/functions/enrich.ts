import { db } from "@/lib/db";
import { originOf } from "@/lib/normalize";
import { findEmail } from "@/lib/providers/hunter";
import { inngest } from "../client";

/**
 * lead/scored (hot only) -> enrich (Hunter email).
 * Skips non-hot leads early. Rate-limited to protect Hunter's free tier.
 */
export const enrich = inngest.createFunction(
  {
    id: "enrich",
    name: "Enrich hot lead",
    concurrency: { limit: 2 },
    throttle: { limit: 10, period: "1s" },
    retries: 1,
  },
  { event: "lead/scored" },
  async ({ event, step }) => {
    if (event.data.priority !== "hot") {
      return { skipped: "not hot" };
    }
    const { leadId } = event.data;

    const lead = await step.run("load", async () =>
      db.lead.findUniqueOrThrow({ where: { id: leadId } }),
    );

    if (!lead.website || lead.email) {
      return { skipped: lead.email ? "already has email" : "no website" };
    }
    const origin = originOf(lead.website);
    const domain = origin ? new URL(origin).host : null;
    if (!domain) return { skipped: "no domain" };

    const job = await step.run("create-job", async () =>
      db.enrichmentJob.create({
        data: { leadId, provider: "hunter", type: "email", status: "running", request: { domain } },
      }),
    );

    const res = await step.run("hunter", async () => findEmail(domain));

    await step.run("save", async () => {
      await db.enrichmentJob.update({
        where: { id: job.id },
        data: {
          status: "done",
          response: res.raw as object,
          costCredits: res.email ? 1 : 0,
          completedAt: new Date(),
        },
      });
      if (res.email) {
        await db.lead.update({
          where: { id: leadId },
          data: { email: res.email, status: "enriched" },
        });
      }
    });

    await step.sendEvent("emit-enriched", {
      name: "lead/enriched",
      data: { leadId },
    });

    return { email: res.email };
  },
);
