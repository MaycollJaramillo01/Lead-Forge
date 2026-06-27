import { originOf } from "@/lib/normalize";
import { queryCrux } from "@/lib/providers/crux";
import { runPageSpeed } from "@/lib/providers/pagespeed";
import { auditWithCheerio } from "./cheerio";

/** Shape mirrors the LeadAudit Prisma model (minus relations/ids). */
export interface AuditResult {
  hasWebsite: boolean;
  httpStatus: number | null;
  hasHttps: boolean;
  isMobileFriendly: boolean | null;
  perfScore: number | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  inCrux: boolean;
  techStack: Record<string, unknown> | null;
  auditSource: string;
}

const NO_WEBSITE: AuditResult = {
  hasWebsite: false,
  httpStatus: null,
  hasHttps: false,
  isMobileFriendly: null,
  perfScore: null,
  seoScore: null,
  accessibilityScore: null,
  lcpMs: null,
  cls: null,
  inpMs: null,
  inCrux: false,
  techStack: null,
  auditSource: "none",
};

/**
 * Run the full audit for a lead's website. Combines:
 *  - Cheerio (https, viewport, tech/builder detection, robots-aware fetch)
 *  - PageSpeed (perf/seo/a11y, LCP, CLS, mobile-friendly)
 *  - CrUX (origin presence + field metrics)
 * Returns NO_WEBSITE when there's no site (the strongest pain signal).
 */
export async function runAudit(website: string | null | undefined): Promise<AuditResult> {
  if (!website) return { ...NO_WEBSITE };

  const [cheerioRes, psRes] = await Promise.all([
    auditWithCheerio(website),
    runPageSpeed(website),
  ]);

  const origin = originOf(website);
  const cruxRes = origin ? await queryCrux(origin) : { inCrux: false, lcpMs: null, inpMs: null, cls: null };

  const sources = ["cheerio"];
  if (psRes) sources.push("pagespeed");
  if (cruxRes.inCrux) sources.push("crux");

  return {
    hasWebsite: true,
    httpStatus: cheerioRes.httpStatus,
    hasHttps: cheerioRes.hasHttps,
    isMobileFriendly:
      psRes?.isMobileFriendly ??
      (cheerioRes.reachable ? cheerioRes.hasViewportMeta : null),
    perfScore: psRes?.perfScore ?? null,
    seoScore: psRes?.seoScore ?? null,
    accessibilityScore: psRes?.accessibilityScore ?? null,
    lcpMs: psRes?.lcpMs ?? cruxRes.lcpMs,
    cls: psRes?.cls ?? cruxRes.cls,
    inpMs: cruxRes.inpMs,
    inCrux: cruxRes.inCrux,
    techStack: cheerioRes.cms
      ? { cms: cheerioRes.cms, cheapBuilder: cheerioRes.cheapBuilder, hasContactForm: cheerioRes.hasContactForm }
      : { hasContactForm: cheerioRes.hasContactForm },
    auditSource: sources.join("+"),
  };
}
