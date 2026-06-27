import { db } from "@/lib/db";
import { geoapifyProvider } from "@/lib/providers/geoapify";
import { overpassProvider } from "@/lib/providers/overpass";
import type { DiscoveryParams, NormalizedLead } from "@/lib/providers/types";
import { inngest } from "../client";

/**
 * campaign/created -> discover.
 * Runs Overpass (primary, no key) + Geoapify (if keyed/mapped), de-dupes by
 * source_id within the batch, then emits lead/discovered for the pipeline.
 */
export const discover = inngest.createFunction(
  {
    id: "discover",
    name: "Discover leads",
    concurrency: { limit: 2 },
    retries: 3,
  },
  { event: "campaign/created" },
  async ({ event, step }) => {
    const { campaignId } = event.data;

    const campaign = await step.run("load-campaign", async () => {
      return db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    });

    await step.run("mark-discovering", async () => {
      await db.campaign.update({
        where: { id: campaignId },
        data: { status: "discovering" },
      });
    });

    const params: DiscoveryParams = {
      industry: campaign.industry,
      zip: campaign.zip ?? undefined,
      city: campaign.city ?? undefined,
      state: campaign.state ?? undefined,
      center:
        campaign.centerLat != null && campaign.centerLon != null
          ? { lat: campaign.centerLat, lon: campaign.centerLon }
          : undefined,
      radiusKm: campaign.radiusKm ?? undefined,
    };

    const osm = await step.run("overpass", async () => {
      try {
        return await overpassProvider.discover(params);
      } catch (err) {
        console.error("[discover] overpass failed", err);
        return [] as NormalizedLead[];
      }
    });

    const geo = await step.run("geoapify", async () => {
      try {
        return await geoapifyProvider.discover(params);
      } catch (err) {
        console.error("[discover] geoapify failed", err);
        return [] as NormalizedLead[];
      }
    });

    // De-dupe within the batch by source_id; normalize/dedupe across runs
    // happens in the next step.
    const seen = new Set<string>();
    const leads: NormalizedLead[] = [];
    for (const l of [...osm, ...geo]) {
      const k = `${l.source}:${l.source_id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      leads.push(l);
    }

    await step.run("update-stats", async () => {
      await db.campaign.update({
        where: { id: campaignId },
        data: {
          status: leads.length ? "auditing" : "done",
          stats: { discovered: leads.length, osm: osm.length, geoapify: geo.length },
        },
      });
    });

    if (leads.length) {
      await step.sendEvent("emit-discovered", {
        name: "lead/discovered",
        data: { campaignId, leads },
      });
    }

    return { discovered: leads.length };
  },
);
