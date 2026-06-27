import axios from "axios";

// Latino business categories on Yelp Fusion
const LATINO_CATEGORIES = [
  "mexican", "latin", "colombian", "peruvian", "cuban",
  "venezuelan", "salvadoran", "honduran", "guatemalan",
  "nicaraguan", "dominican", "puertorican", "argentinian",
  "ecuadorian", "spanishrestaurant", "caribbean",
];

export interface YelpLead {
  yelp_id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  address: string;
  category: string;
  yelp_url: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean; // is_closed === false on Yelp
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function yelpGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const key = process.env.YELP_API_KEY;
  if (!key) throw new Error("YELP_API_KEY not configured in .env");
  const res = await axios.get<T>(`https://api.yelp.com/v3${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    params,
    timeout: 15_000,
  });
  return res.data;
}

interface YelpSearchResult {
  businesses: {
    id: string;
    name: string;
    is_closed: boolean;
    phone: string;
    url: string;
    location: {
      address1?: string;
      city: string;
      state: string;
      zip_code: string;
      display_address: string[];
    };
    coordinates: { latitude: number; longitude: number };
    categories: { alias: string; title: string }[];
  }[];
  total: number;
}

interface YelpDetailResult {
  id: string;
  name: string;
  is_closed: boolean;
  phone: string;
  url: string;
  website?: string; // only in detail endpoint
  location: {
    address1?: string;
    city: string;
    state: string;
    zip_code: string;
    display_address: string[];
  };
  coordinates: { latitude: number; longitude: number };
  categories: { alias: string; title: string }[];
}

/**
 * Fetches active businesses WITHOUT a website from Yelp by keyword.
 * Searches by term (e.g. "roofing", "cleaning service") instead of hardcoded categories.
 */
export async function fetchYelpByKeyword(
  keyword: string,
  location: string,
  maxLeads = 50,
): Promise<YelpLead[]> {
  type YelpBiz = YelpSearchResult["businesses"][number];
  const candidates = new Map<string, YelpBiz>();

  for (let offset = 0; offset < Math.min(1000, maxLeads * 6); offset += 50) {
    if (candidates.size >= maxLeads * 4) break;
    try {
      const data = await yelpGet<YelpSearchResult>("/businesses/search", {
        location,
        term: keyword,
        limit: 50,
        offset,
        sort_by: "best_match",
      });
      for (const b of data.businesses) {
        if (!b.is_closed && !candidates.has(b.id)) candidates.set(b.id, b);
      }
      if (data.businesses.length < 50) break;
    } catch {
      break;
    }
    await sleep(250);
  }

  const results: YelpLead[] = [];
  for (const biz of candidates.values()) {
    if (results.length >= maxLeads) break;
    try {
      const d = await yelpGet<YelpDetailResult>(`/businesses/${biz.id}`);
      if (d.is_closed) continue;
      if (d.website?.trim()) continue;
      results.push({
        yelp_id: d.id,
        name: d.name,
        phone: d.phone ?? "",
        street: d.location.address1 ?? "",
        city: d.location.city,
        state: d.location.state,
        zip: d.location.zip_code,
        address: d.location.display_address.join(", "),
        category: d.categories[0]?.title ?? keyword,
        yelp_url: d.url,
        latitude: d.coordinates?.latitude ?? null,
        longitude: d.coordinates?.longitude ?? null,
        is_active: true,
      });
    } catch {
      // skip individual lookup errors
    }
    await sleep(200);
  }

  return results;
}

/**
 * Fetches active Latino businesses WITHOUT a website from Yelp.
 * Filters: is_closed=false (active), no website_url.
 * No rating data stored anywhere.
 */
export async function fetchYelpLatinoNoWebsite(
  location: string,
  maxLeads = 50,
): Promise<YelpLead[]> {
  // 1. Collect candidates across Latino categories
  const seen = new Map<string, (typeof yelpSearchResult)[number]>();
  type YelpBiz = YelpSearchResult["businesses"][number];
  let yelpSearchResult: YelpBiz[] = [];

  for (const cat of LATINO_CATEGORIES) {
    if (seen.size >= maxLeads * 4) break; // collect ~4x candidates to account for website filter
    try {
      const data = await yelpGet<YelpSearchResult>("/businesses/search", {
        location,
        categories: cat,
        limit: 50,
        sort_by: "best_match",
      });
      for (const b of data.businesses) {
        if (!b.is_closed && !seen.has(b.id)) seen.set(b.id, b);
      }
      yelpSearchResult = [...seen.values()];
    } catch {
      // category has no results in this market — skip
    }
    await sleep(250);
  }

  const candidates = [...seen.values()];

  // 2. Fetch details to check website_url — filter out any WITH a website
  const results: YelpLead[] = [];
  for (const biz of candidates) {
    if (results.length >= maxLeads) break;
    try {
      const d = await yelpGet<YelpDetailResult>(`/businesses/${biz.id}`);
      // Active = not permanently closed; no website = lead opportunity
      if (d.is_closed) continue;
      if (d.website && d.website.trim() !== "") continue;

      results.push({
        yelp_id: d.id,
        name: d.name,
        phone: d.phone ?? "",
        street: d.location.address1 ?? "",
        city: d.location.city,
        state: d.location.state,
        zip: d.location.zip_code,
        address: d.location.display_address.join(", "),
        category: d.categories[0]?.title ?? "Latino",
        yelp_url: d.url,
        latitude: d.coordinates?.latitude ?? null,
        longitude: d.coordinates?.longitude ?? null,
        is_active: true,
      });
    } catch {
      // skip individual lookup errors
    }
    await sleep(200);
  }

  return results;
}
