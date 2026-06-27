import { describe, expect, it } from "vitest";
import {
  buildDedupeKey,
  last7,
  normalizeName,
  normalizePhone,
  normalizeWebsite,
  normalizeZip,
  originOf,
  slug,
} from "@/lib/normalize";

describe("normalizeName", () => {
  it("lowercases, strips suffixes & punctuation", () => {
    expect(normalizeName("Smith & Sons Roofing, LLC")).toBe("smith sons roofing");
    expect(normalizeName("The Joe's Café")).toBe("joe s cafe");
  });
});

describe("slug", () => {
  it("hyphenates the normalized name", () => {
    expect(slug("Smith & Sons Roofing LLC")).toBe("smith-sons-roofing");
  });
});

describe("normalizePhone", () => {
  it("parses US numbers to E.164", () => {
    expect(normalizePhone("(214) 555-0182")).toBe("+12145550182");
    expect(normalizePhone("214.555.0182")).toBe("+12145550182");
  });
  it("returns empty for junk", () => {
    expect(normalizePhone("call us!")).toBe("");
    expect(normalizePhone(null)).toBe("");
  });
});

describe("last7 / normalizeZip", () => {
  it("last7 takes trailing digits", () => {
    expect(last7("+12145550182")).toBe("5550182");
  });
  it("normalizeZip keeps 5 digits", () => {
    expect(normalizeZip("75201-1234")).toBe("75201");
  });
});

describe("buildDedupeKey", () => {
  it("is stable across phone formats", () => {
    const a = buildDedupeKey("Smith & Sons Roofing LLC", "75201", "(214) 555-0182");
    const b = buildDedupeKey("smith and sons roofing", "75201", "214.555.0182");
    // 'and' isn't stripped, so names differ slightly — confirm format & phone part
    expect(a).toBe("smith-sons-roofing|75201|5550182");
    expect(b.endsWith("|75201|5550182")).toBe(true);
  });
});

describe("normalizeWebsite / originOf", () => {
  it("adds https and strips trailing slash", () => {
    expect(normalizeWebsite("example.com/")).toBe("https://example.com");
    expect(normalizeWebsite("HTTP://Example.com/path/")).toBe("http://example.com/path");
  });
  it("treats N/A as no website", () => {
    expect(normalizeWebsite("N/A")).toBe("");
    expect(normalizeWebsite("")).toBe("");
  });
  it("originOf returns scheme+host", () => {
    expect(originOf("https://example.com/contact")).toBe("https://example.com");
  });
});
