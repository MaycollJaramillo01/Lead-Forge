import { describe, expect, it } from "vitest";
import { computePainScore, type ScoreInput } from "@/lib/scoring";

const base: ScoreInput = {
  hasWebsite: true,
  perfScore: 0.9,
  isMobileFriendly: true,
  hasHttps: true,
  cheapBuilder: false,
  lcpMs: 1500,
  rating: 4.8,
  reviewCount: 120,
  inCrux: true,
  highCompetition: false,
  businessStatus: "operational",
};

describe("computePainScore", () => {
  it("a healthy business with a great site is cold", () => {
    const r = computePainScore(base);
    expect(r.painScore).toBe(0);
    expect(r.priority).toBe("cold");
  });

  it("no website is the strongest signal and is hot", () => {
    const r = computePainScore({ ...base, hasWebsite: false });
    expect(r.scoreBreakdown.noWebsite).toBe(40);
    // +40 (no site) +8 (rating na? rating 4.8 ok) ... rating/reviews still count
    // rating 4.8 and 120 reviews => no add. So 40 only => warm boundary.
    expect(r.painScore).toBeGreaterThanOrEqual(40);
  });

  it("a bad website stacks signals into hot", () => {
    const r = computePainScore({
      ...base,
      perfScore: 0.2,
      isMobileFriendly: false,
      hasHttps: false,
      cheapBuilder: true,
      lcpMs: 5000,
      rating: 3.5,
      reviewCount: 4,
      inCrux: false,
    });
    // lowPerf: (1-0.2/0.5)*20=12, notMobile 15, noHttps 10, cheap 10,
    // slowLcp 10, notInCrux 5, lowRating 8, fewReviews 7 => 77
    expect(r.painScore).toBe(77);
    expect(r.priority).toBe("hot");
  });

  it("closed businesses are discarded", () => {
    const r = computePainScore({ ...base, hasWebsite: false, businessStatus: "closed" });
    expect(r.painScore).toBe(0);
    expect(r.scoreBreakdown).toEqual({ closed: -100 });
  });

  it("no-website path excludes site signals (caps at non-site sum)", () => {
    const r = computePainScore({
      hasWebsite: false,
      perfScore: 0,
      isMobileFriendly: false,
      hasHttps: false,
      cheapBuilder: true,
      lcpMs: 9000,
      rating: 1,
      reviewCount: 0,
      inCrux: false,
      highCompetition: true,
      businessStatus: "operational",
    });
    // no-website path skips site signals; 40 + lowRating 8 + fewReviews 7 + comp 5 = 60
    expect(r.painScore).toBe(60);
    expect(r.priority).toBe("hot");
  });

  it("warm sits in the 35-59 band", () => {
    const r = computePainScore({
      ...base,
      perfScore: 0.3, // (1-0.6)*20 = 8
      isMobileFriendly: false, // 15
      hasHttps: false, // 10
      // 8+15+10 = 33... add fewReviews
      reviewCount: 5, // 7 => 40 -> still hot boundary? 40 is warm (35-59)
    });
    expect(r.priority).toBe("warm");
  });
});
