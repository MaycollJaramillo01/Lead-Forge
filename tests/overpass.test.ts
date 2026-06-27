import { describe, expect, it } from "vitest";
import { buildOverpassQL, parseOverpassResponse } from "@/lib/providers/overpass";

describe("buildOverpassQL", () => {
  it("builds a city-area query (zero geocoding) for roofing in Dallas TX", () => {
    const ql = buildOverpassQL("roofing", { industry: "roofing", city: "Dallas", state: "TX" });
    expect(ql).toContain('area["name"="TX"]["admin_level"="4"]->.st;');
    expect(ql).toContain('area["name"="Dallas"]["boundary"="administrative"](area.st)->.searchArea;');
    expect(ql).toContain('node["craft"="roofer"](area.searchArea);');
    expect(ql).toContain('node["shop"="roofer"](area.searchArea);');
    expect(ql).toContain("out center tags;");
  });

  it("builds an around query for center+radius", () => {
    const ql = buildOverpassQL("hvac", {
      industry: "hvac",
      center: { lat: 32.78, lon: -96.8 },
      radiusKm: 10,
    });
    expect(ql).toContain('node["craft"="hvac"](around:10000,32.78,-96.8);');
  });

  it("builds a bbox query", () => {
    const ql = buildOverpassQL("dental", {
      industry: "dental",
      bbox: [32.6, -97.0, 32.9, -96.6],
    });
    expect(ql).toContain('node["amenity"="dentist"](32.6,-97,32.9,-96.6);');
  });

  it("throws on unknown industry", () => {
    expect(() => buildOverpassQL("aliens", { industry: "aliens", city: "Dallas" })).toThrow();
  });
});

describe("parseOverpassResponse", () => {
  it("maps nodes and way-centers, skipping unnamed elements", () => {
    const leads = parseOverpassResponse(
      {
        elements: [
          {
            type: "node",
            id: 1,
            lat: 32.78,
            lon: -96.8,
            tags: {
              name: "Acme Roofing",
              phone: "+1 214-555-0182",
              website: "http://acme-roofing.com",
              "addr:city": "Dallas",
              "addr:state": "TX",
              "addr:postcode": "75201",
            },
          },
          {
            type: "way",
            id: 2,
            center: { lat: 32.79, lon: -96.81 },
            tags: { name: "Bob's Roofs" },
          },
          { type: "node", id: 3, lat: 1, lon: 1, tags: { amenity: "bench" } }, // unnamed → skip
        ],
      },
      "roofing",
    );
    expect(leads).toHaveLength(2);
    expect(leads[0]).toMatchObject({
      source: "openstreetmap",
      source_id: "node/1",
      business_name: "Acme Roofing",
      city: "Dallas",
      state: "TX",
      zip: "75201",
      industry: "roofing",
    });
    expect(leads[1].latitude).toBe("32.79"); // from way center
  });
});
