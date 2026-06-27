import type { DiscoveryParams, DiscoveryProvider, NormalizedLead } from "./types";

/**
 * Phase 2 stub — Google Places (Text/Nearby Search).
 * COMPLIANCE: Google Places content must NOT be persisted > 30 days. When
 * implementing, store only IDs + a refresh timestamp, never long-lived copies.
 */
export const googlePlacesEnabled = (): boolean =>
  !!process.env.GOOGLE_PLACES_API_KEY;

export const googlePlacesProvider: DiscoveryProvider = {
  name: "google_places",
  async discover(_p: DiscoveryParams): Promise<NormalizedLead[]> {
    if (!googlePlacesEnabled()) return [];
    throw new Error("google_places provider not implemented (phase 2)");
  },
};
