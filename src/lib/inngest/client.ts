import { EventSchemas, Inngest } from "inngest";
import type { NormalizedLead } from "@/lib/providers/types";

/** Typed event payloads for the discovery → score pipeline. */
type Events = {
  "campaign/created": { data: { campaignId: string } };
  "lead/discovered": {
    data: { campaignId: string; leads: NormalizedLead[] };
  };
  "lead/ready": { data: { leadId: string; campaignId?: string } };
  "lead/audited": { data: { leadId: string } };
  "lead/scored": { data: { leadId: string; priority: string } };
  "lead/enriched": { data: { leadId: string } };
  "export/requested": { data: { exportId: string } };
};

export const inngest = new Inngest({
  id: "leadforge",
  schemas: new EventSchemas().fromRecord<Events>(),
});
