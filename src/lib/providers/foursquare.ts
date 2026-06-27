import type { DiscoveryParams, DiscoveryProvider, NormalizedLead } from "./types";

/**
 * Phase 2 stub — Foursquare Places API Pro (+ OS Places ingest).
 * Foursquare data is persistable with attribution (unlike Google/Yelp).
 */
export const foursquareEnabled = (): boolean => !!process.env.FOURSQUARE_API_KEY;

export const foursquareProvider: DiscoveryProvider = {
  name: "foursquare",
  async discover(_p: DiscoveryParams): Promise<NormalizedLead[]> {
    if (!foursquareEnabled()) return [];
    throw new Error("foursquare provider not implemented (phase 2)");
  },
};
