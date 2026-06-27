export interface NormalizedLead {
  source: string;
  source_id: string;
  business_name: string;
  category: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: "US";
  phone: string;
  website: string;
  email: string;
  latitude: string;
  longitude: string;
  raw_tags: Record<string, unknown>;
  captured_at: string; // ISO
}

export interface DiscoveryParams {
  zip?: string;
  city?: string;
  state?: string;
  bbox?: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  center?: { lat: number; lon: number };
  radiusKm?: number;
  industry: string;
}

export interface DiscoveryProvider {
  name: string;
  discover(p: DiscoveryParams): Promise<NormalizedLead[]>;
}

export const EMPTY_LEAD: Omit<
  NormalizedLead,
  "source" | "source_id" | "business_name" | "industry" | "captured_at"
> = {
  category: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  phone: "",
  website: "",
  email: "",
  latitude: "",
  longitude: "",
  raw_tags: {},
};
