/**
 * Pain score. Higher = more digital pain = better lead.
 * Pure function: given audit signals, returns 0..100 + breakdown + priority.
 */

export interface ScoreInput {
  hasWebsite: boolean;
  perfScore: number | null; // 0..1 (mobile)
  isMobileFriendly: boolean | null;
  hasHttps: boolean | null;
  cheapBuilder: boolean | null; // Wix/Weebly/GoDaddy/Squarespace basic
  lcpMs: number | null;
  inCrux: boolean | null;
  highCompetition: boolean | null;
  businessStatus: string | null; // operational|closed|unknown
}

export interface ScoreResult {
  painScore: number; // 0..100 (clamped)
  priority: "hot" | "warm" | "cold";
  scoreBreakdown: Record<string, number>;
}

export function computePainScore(input: ScoreInput): ScoreResult {
  const b: Record<string, number> = {};

  if (input.businessStatus === "closed") {
    return { painScore: 0, priority: "cold", scoreBreakdown: { closed: -100 } };
  }

  if (!input.hasWebsite) {
    b.noWebsite = 40;
  } else {
    if (input.perfScore != null && input.perfScore < 0.5) {
      b.lowPerf = Math.round((1 - input.perfScore / 0.5) * 20);
    }
    if (input.isMobileFriendly === false) b.notMobileFriendly = 15;
    if (input.hasHttps === false) b.noHttps = 10;
    if (input.cheapBuilder === true) b.cheapBuilder = 10;
    if (input.lcpMs != null && input.lcpMs > 4000) b.slowLcp = 10;
    if (input.inCrux === false) b.notInCrux = 5;
  }

  if (input.highCompetition === true) b.highCompetition = 5;

  const raw = Object.values(b).reduce((s, n) => s + n, 0);
  const painScore = Math.max(0, Math.min(100, raw));
  const priority: ScoreResult["priority"] =
    painScore >= 60 ? "hot" : painScore >= 35 ? "warm" : "cold";

  return { painScore, priority, scoreBreakdown: b };
}
