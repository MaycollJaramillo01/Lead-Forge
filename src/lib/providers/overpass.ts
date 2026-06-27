import axios from "axios";
import { getIndustry, type OsmTagFilter } from "@/lib/industry/map";
import { logUsage, requestHash } from "@/lib/usage/log";
import type {
  DiscoveryParams,
  DiscoveryProvider,
  NormalizedLead,
} from "./types";

const ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface AreaSpec {
  /** clause appended to each statement, e.g. "(around:5000,32.7,-96.8)" */
  clause: string;
  /** optional preamble defining a named area set referenced by the clause */
  preamble: string;
}

/**
 * Resolve an area for the query in priority order:
 *   1. center + radiusKm  -> around:
 *   2. bbox               -> (minLat,minLon,maxLat,maxLon)
 *   3. city (+ state)     -> Overpass `area` set (zero external geocoding)
 */
function resolveArea(p: DiscoveryParams): AreaSpec {
  if (p.center && p.radiusKm) {
    const meters = Math.round(p.radiusKm * 1000);
    return { clause: `(around:${meters},${p.center.lat},${p.center.lon})`, preamble: "" };
  }
  if (p.bbox) {
    const [minLat, minLon, maxLat, maxLon] = p.bbox;
    return { clause: `(${minLat},${minLon},${maxLat},${maxLon})`, preamble: "" };
  }
  if (p.city) {
    // Disambiguate by state via admin boundaries when provided.
    const stateFilter = p.state ? `area["name"="${p.state}"]["admin_level"="4"]->.st;\n` : "";
    const cityArea = p.state
      ? `area["name"="${p.city}"]["boundary"="administrative"](area.st)->.searchArea;`
      : `area["name"="${p.city}"]["boundary"="administrative"]->.searchArea;`;
    return { clause: "(area.searchArea)", preamble: `${stateFilter}${cityArea}\n` };
  }
  throw new Error("overpass: need center+radiusKm, bbox, or city");
}

function tagSelector(f: OsmTagFilter): string {
  if (!f.v || f.v === "*") return `["${f.k}"]`;
  return `["${f.k}"="${f.v}"]`;
}

/** Pure: build Overpass QL for an industry over an area. Unit-tested. */
export function buildOverpassQL(
  industrySlug: string,
  p: DiscoveryParams,
): string {
  const industry = getIndustry(industrySlug);
  if (!industry) throw new Error(`unknown industry: ${industrySlug}`);
  const area = resolveArea(p);
  const stmts: string[] = [];
  for (const f of industry.osm) {
    const sel = tagSelector(f);
    stmts.push(`  node${sel}${area.clause};`);
    stmts.push(`  way${sel}${area.clause};`);
    stmts.push(`  relation${sel}${area.clause};`);
  }
  return `[out:json][timeout:60];\n${area.preamble}(\n${stmts.join("\n")}\n);\nout center tags;`;
}

/** Pure: map an Overpass response to NormalizedLeads. Unit-tested. */
export function parseOverpassResponse(
  json: OverpassResponse,
  industrySlug: string,
): NormalizedLead[] {
  const industry = getIndustry(industrySlug);
  const now = new Date().toISOString();
  const out: NormalizedLead[] = [];
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags.name ?? tags["operator"] ?? "";
    if (!name) continue; // unnamed geometry is not a sellable lead
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    out.push({
      source: "openstreetmap",
      source_id: `${el.type}/${el.id}`,
      business_name: name,
      category: industry?.name ?? "",
      industry: industrySlug,
      address: [tags["addr:housenumber"], tags["addr:street"]]
        .filter(Boolean)
        .join(" "),
      city: tags["addr:city"] ?? "",
      state: tags["addr:state"] ?? "",
      zip: tags["addr:postcode"] ?? "",
      country: "US",
      phone: tags.phone ?? tags["contact:phone"] ?? "",
      website: tags.website ?? tags["contact:website"] ?? "",
      email: tags.email ?? tags["contact:email"] ?? "",
      latitude: lat != null ? String(lat) : "",
      longitude: lon != null ? String(lon) : "",
      raw_tags: tags,
      captured_at: now,
    });
  }
  return out;
}

async function postWithBackoff(ql: string, maxRetries = 4): Promise<OverpassResponse> {
  let attempt = 0;
  let lastStatus = 0;
  // Overpass is rate-limited; back off on 429/504.
  while (attempt <= maxRetries) {
    try {
      const res = await axios.post<OverpassResponse>(
        ENDPOINT,
        `data=${encodeURIComponent(ql)}`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 90_000,
        },
      );
      lastStatus = res.status;
      return res.data;
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
      lastStatus = status;
      if ((status === 429 || status === 504) && attempt < maxRetries) {
        const waitMs = Math.min(2000 * 2 ** attempt, 30_000);
        await new Promise((r) => setTimeout(r, waitMs));
        attempt++;
        continue;
      }
      await logUsage({ provider: "openstreetmap", endpoint: "interpreter", httpStatus: status });
      throw err;
    }
  }
  await logUsage({ provider: "openstreetmap", endpoint: "interpreter", httpStatus: lastStatus });
  throw new Error(`overpass: exhausted retries (last status ${lastStatus})`);
}

export const overpassProvider: DiscoveryProvider = {
  name: "openstreetmap",
  async discover(p: DiscoveryParams): Promise<NormalizedLead[]> {
    const ql = buildOverpassQL(p.industry, p);
    const json = await postWithBackoff(ql);
    await logUsage({
      provider: "openstreetmap",
      endpoint: "interpreter",
      httpStatus: 200,
      requestHash: requestHash({ ql }),
    });
    return parseOverpassResponse(json, p.industry);
  },
};
