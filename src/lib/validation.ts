import { z } from "zod";
import { INDUSTRIES } from "@/lib/industry/map";

const industrySlugs = INDUSTRIES.map((i) => i.slug) as [string, ...string[]];

export const createCampaignSchema = z
  .object({
    name: z.string().min(1).optional(),
    industry: z.enum(industrySlugs),
    state: z.string().length(2).optional(),
    city: z.string().min(1).optional(),
    zip: z.string().regex(/^\d{5}$/).optional(),
    county: z.string().optional(),
    radiusKm: z.number().int().positive().max(200).optional(),
    centerLat: z.number().min(-90).max(90).optional(),
    centerLon: z.number().min(-180).max(180).optional(),
  })
  .refine(
    (d) =>
      d.city ||
      d.zip ||
      (d.centerLat != null && d.centerLon != null && d.radiusKm != null),
    { message: "Provide a city, a zip, or center+radiusKm to bound the search." },
  );

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const leadsQuerySchema = z.object({
  state: z.string().optional(),
  zip: z.string().optional(),
  industry: z.string().optional(),
  priority: z.enum(["hot", "warm", "cold"]).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
