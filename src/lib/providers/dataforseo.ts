import type { DiscoveryParams, DiscoveryProvider, NormalizedLead } from "./types";

/**
 * Phase 2 stub — DataForSEO (Google Maps/Local SERP + OnPage).
 * Feature-flagged: only active when DATAFORSEO_LOGIN/PASSWORD are set.
 */
export const dataforseoEnabled = (): boolean =>
  !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);

export const dataforseoProvider: DiscoveryProvider = {
  name: "dataforseo",
  async discover(_p: DiscoveryParams): Promise<NormalizedLead[]> {
    if (!dataforseoEnabled()) return [];
    throw new Error("dataforseo provider not implemented (phase 2)");
  },
};
