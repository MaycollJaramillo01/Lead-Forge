/**
 * Single source of truth: industry → OSM tags → NAICS.
 * Used by prisma/seed.ts (to populate Category) and by the Overpass adapter
 * (to build Overpass QL). Each `osm` entry is a list of {k,v} tag filters; a
 * lead matches if it carries ANY of them. `v: "*"` means "key present, any value".
 */
export interface OsmTagFilter {
  k: string;
  v?: string; // omit or "*" => any value
}

export interface IndustryDef {
  /** stable slug used throughout the app (Campaign.industry, Lead.industry) */
  slug: string;
  name: string;
  naics: string;
  osm: OsmTagFilter[];
  /** OSM tags that map to {cms} or builder hints are handled in audit, not here */
}

export const INDUSTRIES: IndustryDef[] = [
  {
    slug: "roofing",
    name: "Roofing",
    naics: "238160",
    osm: [{ k: "craft", v: "roofer" }, { k: "shop", v: "roofer" }],
  },
  {
    slug: "hvac",
    name: "HVAC",
    naics: "238220",
    osm: [{ k: "craft", v: "hvac" }],
  },
  {
    slug: "plumbing",
    name: "Plumbing",
    naics: "238220",
    osm: [{ k: "craft", v: "plumber" }],
  },
  {
    slug: "painting",
    name: "Painting",
    naics: "238320",
    osm: [{ k: "craft", v: "painter" }],
  },
  {
    slug: "landscaping",
    name: "Landscaping",
    naics: "561730",
    osm: [{ k: "craft", v: "gardener" }, { k: "shop", v: "garden_centre" }],
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    naics: "561720",
    osm: [{ k: "craft", v: "cleaning" }, { k: "office", v: "company" }],
  },
  {
    slug: "flooring",
    name: "Flooring",
    naics: "238330",
    osm: [{ k: "craft", v: "floorer" }, { k: "shop", v: "flooring" }],
  },
  {
    slug: "remodeling",
    name: "Remodeling",
    naics: "236118",
    osm: [{ k: "craft", v: "carpenter" }, { k: "shop", v: "doityourself" }],
  },
  {
    slug: "restaurants",
    name: "Restaurants",
    naics: "722511",
    osm: [
      { k: "amenity", v: "restaurant" },
      { k: "amenity", v: "fast_food" },
      { k: "amenity", v: "cafe" },
    ],
  },
  {
    slug: "beauty",
    name: "Beauty salons",
    naics: "812112",
    osm: [{ k: "shop", v: "hairdresser" }, { k: "shop", v: "beauty" }],
  },
  {
    slug: "dental",
    name: "Dental",
    naics: "621210",
    osm: [{ k: "amenity", v: "dentist" }, { k: "healthcare", v: "dentist" }],
  },
  {
    slug: "auto_repair",
    name: "Auto repair",
    naics: "811111",
    osm: [{ k: "shop", v: "car_repair" }],
  },
  {
    slug: "junk_car_removal",
    name: "Junk car removal",
    naics: "423930",
    osm: [{ k: "shop", v: "scrap_yard" }, { k: "amenity", v: "recycling" }],
  },
  {
    slug: "contractors",
    name: "General contractors",
    naics: "236118",
    osm: [{ k: "office", v: "construction_company" }, { k: "craft", v: "builder" }],
  },
];

export function getIndustry(slug: string): IndustryDef | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}
