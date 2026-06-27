import axios from "axios";
import { logUsage } from "@/lib/usage/log";
import { withinDailyBudget } from "@/lib/usage/log";

const URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export interface PageSpeedResult {
  perfScore: number | null; // 0..1
  seoScore: number | null; // 0..1
  accessibilityScore: number | null; // 0..1
  lcpMs: number | null;
  cls: number | null;
  isMobileFriendly: boolean | null;
}

/** Pure: extract the fields we score on from a Lighthouse v5 payload. */
export function parsePageSpeed(data: any): PageSpeedResult {
  const lr = data?.lighthouseResult;
  const cats = lr?.categories ?? {};
  const audits = lr?.audits ?? {};
  const lcp = audits["largest-contentful-paint"]?.numericValue;
  const cls = audits["cumulative-layout-shift"]?.numericValue;
  const viewport = audits["viewport"]?.score; // 1 = has a proper viewport meta
  return {
    perfScore: cats.performance?.score ?? null,
    seoScore: cats.seo?.score ?? null,
    accessibilityScore: cats.accessibility?.score ?? null,
    lcpMs: lcp != null ? Math.round(lcp) : null,
    cls: cls != null ? Number(cls.toFixed(3)) : null,
    isMobileFriendly: viewport != null ? viewport === 1 : null,
  };
}

export async function runPageSpeed(
  websiteUrl: string,
): Promise<PageSpeedResult | null> {
  if (!(await withinDailyBudget("pagespeed", "BUDGET_PAGESPEED_DAILY"))) {
    return null; // budget guard: degrade rather than burn the free tier
  }
  try {
    const res = await axios.get(URL, {
      params: {
        url: websiteUrl,
        strategy: "mobile",
        category: ["performance", "seo", "accessibility"],
        key: process.env.PAGESPEED_API_KEY || undefined,
      },
      // axios serializes array params as category=performance&category=seo
      paramsSerializer: { indexes: null },
      timeout: 60_000,
    });
    await logUsage({ provider: "pagespeed", endpoint: "runPagespeed", httpStatus: res.status });
    return parsePageSpeed(res.data);
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
    await logUsage({ provider: "pagespeed", endpoint: "runPagespeed", httpStatus: status });
    return null; // a failed audit shouldn't kill the pipeline; score with what we have
  }
}
