import axios from "axios";
import { getIndustry } from "@/lib/industry/map";
import { logUsage } from "@/lib/usage/log";
import type {
  DiscoveryParams,
  DiscoveryProvider,
  NormalizedLead,
} from "./types";

const BASE = "https://api.geoapify.com";

/** Industry slug → Geoapify Places category. Only mapped ones are queried. */
const GEOAPIFY_CATEGORIES: Record<string, string> = {
  restaurants: "catering.restaurant,catering.fast_food,catering.cafe",
  beauty: "service.beauty",
  dental: "healthcare.dentist",
  auto_repair: "service.vehicle.repair",
  hvac: "service",
  plumbing: "service",
  roofing: "service",
};

function key(): string {
  const k = process.env.GEOAPIFY_API_KEY;
  if (!k) throw new Error("GEOAPIFY_API_KEY is not set");
  return k;
}

/** ZIP → bounding box [minLat, minLon, maxLat, maxLon] via Geoapify geocoder. */
export async function geocodeZip(
  zip: string,
): Promise<[number, number, number, number] | null> {
  const url = `${BASE}/v1/geocode/search`;
  try {
    const res = await axios.get(url, {
      params: { postcode: zip, country: "us", format: "json", apiKey: key() },
      timeout: 20_000,
    });
    await logUsage({ provider: "geoapify", endpoint: "geocode", httpStatus: res.status });
    const r = res.data?.results?.[0];
    const b = r?.bbox;
    if (b && b.lon1 != null) {
      return [b.lat1, b.lon1, b.lat2, b.lon2];
    }
    if (r?.lat != null) {
      // No bbox returned: synthesize a ~5km box around the centroid.
      const d = 0.05;
      return [r.lat - d, r.lon - d, r.lat + d, r.lon + d];
    }
    return null;
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
    await logUsage({ provider: "geoapify", endpoint: "geocode", httpStatus: status });
    throw err;
  }
}

interface GeoapifyFeature {
  properties: Record<string, unknown>;
}

/** Pure: map a Geoapify Places feature collection to NormalizedLeads. */
export function parseGeoapify(
  features: GeoapifyFeature[],
  industrySlug: string,
): NormalizedLead[] {
  const industry = getIndustry(industrySlug);
  const now = new Date().toISOString();
  const out: NormalizedLead[] = [];
  for (const f of features ?? []) {
    const p = f.properties as Record<string, string | number | undefined>;
    const name = String(p.name ?? "");
    if (!name) continue;
    out.push({
      source: "geoapify",
      source_id: String(p.place_id ?? `${p.lat},${p.lon}`),
      business_name: name,
      category: industry?.name ?? "",
      industry: industrySlug,
      address: String(p.address_line1 ?? p.street ?? ""),
      city: String(p.city ?? ""),
      state: String(p.state_code ?? p.state ?? ""),
      zip: String(p.postcode ?? ""),
      country: "US",
      phone: String(p.phone ?? ""),
      website: String(p.website ?? ""),
      email: "",
      latitude: p.lat != null ? String(p.lat) : "",
      longitude: p.lon != null ? String(p.lon) : "",
      rating: null,
      review_count: null,
      raw_tags: p,
      captured_at: now,
    });
  }
  return out;
}

export const geoapifyProvider: DiscoveryProvider = {
  name: "geoapify",
  async discover(p: DiscoveryParams): Promise<NormalizedLead[]> {
    const categories = GEOAPIFY_CATEGORIES[p.industry];
    if (!categories) return []; // no category mapping — rely on Overpass
    if (!p.center || !p.radiusKm) {
      // Geoapify circle filter needs a center; skip if only a bbox was given.
      if (!p.bbox) return [];
    }
    const filter = p.center && p.radiusKm
      ? `circle:${p.center.lon},${p.center.lat},${Math.round(p.radiusKm * 1000)}`
      : `rect:${p.bbox![1]},${p.bbox![0]},${p.bbox![3]},${p.bbox![2]}`;
    const url = `${BASE}/v2/places`;
    try {
      const res = await axios.get(url, {
        params: { categories, filter, limit: 100, apiKey: key() },
        timeout: 30_000,
      });
      await logUsage({ provider: "geoapify", endpoint: "places", httpStatus: res.status });
      return parseGeoapify(res.data?.features ?? [], p.industry);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
      await logUsage({ provider: "geoapify", endpoint: "places", httpStatus: status });
      throw err;
    }
  },
};
