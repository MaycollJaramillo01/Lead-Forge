import axios from "axios";
import { logUsage, withinDailyBudget } from "@/lib/usage/log";

const URL = "https://api.hunter.io/v2/domain-search";

export interface HunterResult {
  email: string | null;
  confidence: number | null;
  raw: unknown;
}

/**
 * Domain → best contact email. Called ONLY from the enrich job for hot leads
 * (free tier is tiny — guarded by BUDGET_HUNTER_MONTHLY).
 */
export async function findEmail(domain: string): Promise<HunterResult> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return { email: null, confidence: null, raw: null };
  if (!(await withinDailyBudget("hunter", "BUDGET_HUNTER_MONTHLY"))) {
    return { email: null, confidence: null, raw: { skipped: "budget" } };
  }
  try {
    const res = await axios.get(URL, {
      params: { domain, api_key: key },
      timeout: 20_000,
    });
    await logUsage({ provider: "hunter", endpoint: "domain-search", httpStatus: res.status, creditsUsed: 1 });
    const emails = res.data?.data?.emails ?? [];
    const best = emails.sort(
      (a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0),
    )[0];
    return {
      email: best?.value ?? null,
      confidence: best?.confidence ?? null,
      raw: res.data?.data ?? null,
    };
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
    await logUsage({ provider: "hunter", endpoint: "domain-search", httpStatus: status });
    return { email: null, confidence: null, raw: null };
  }
}
