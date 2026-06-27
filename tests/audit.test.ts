import { describe, expect, it } from "vitest";
import { analyzeHtml } from "@/lib/audit/cheerio";
import { parsePageSpeed } from "@/lib/providers/pagespeed";
import { parseCrux } from "@/lib/providers/crux";

describe("analyzeHtml", () => {
  it("detects Wix as a cheap builder and a missing viewport", () => {
    const html = `<html><head><meta name="generator" content="Wix.com Website Builder"></head>
      <body><div class="wixstatic"></div></body></html>`;
    const r = analyzeHtml(html, "https://example.com");
    expect(r.cms).toBe("Wix");
    expect(r.cheapBuilder).toBe(true);
    expect(r.hasViewportMeta).toBe(false);
    expect(r.hasHttps).toBe(true);
  });

  it("detects WordPress (not a cheap builder), viewport & contact form", () => {
    const html = `<html><head><meta name="viewport" content="width=device-width"></head>
      <body><link href="/wp-content/themes/x.css"><form><input type="email"></form></body></html>`;
    const r = analyzeHtml(html, "http://example.com");
    expect(r.cms).toBe("WordPress");
    expect(r.cheapBuilder).toBe(false);
    expect(r.hasViewportMeta).toBe(true);
    expect(r.hasContactForm).toBe(true);
    expect(r.hasHttps).toBe(false);
  });
});

describe("parsePageSpeed", () => {
  it("extracts scores and core web vitals", () => {
    const r = parsePageSpeed({
      lighthouseResult: {
        categories: { performance: { score: 0.42 }, seo: { score: 0.9 }, accessibility: { score: 0.8 } },
        audits: {
          "largest-contentful-paint": { numericValue: 4200.7 },
          "cumulative-layout-shift": { numericValue: 0.1234 },
          viewport: { score: 1 },
        },
      },
    });
    expect(r.perfScore).toBe(0.42);
    expect(r.seoScore).toBe(0.9);
    expect(r.lcpMs).toBe(4201);
    expect(r.cls).toBe(0.123);
    expect(r.isMobileFriendly).toBe(true);
  });
});

describe("parseCrux", () => {
  it("returns inCrux=false when no record", () => {
    expect(parseCrux({})).toEqual({ inCrux: false, lcpMs: null, inpMs: null, cls: null });
  });
  it("extracts p75 metrics", () => {
    const r = parseCrux({
      record: {
        metrics: {
          largest_contentful_paint: { percentiles: { p75: 3200 } },
          interaction_to_next_paint: { percentiles: { p75: 250 } },
          cumulative_layout_shift: { percentiles: { p75: "0.05" } },
        },
      },
    });
    expect(r).toEqual({ inCrux: true, lcpMs: 3200, inpMs: 250, cls: 0.05 });
  });
});
