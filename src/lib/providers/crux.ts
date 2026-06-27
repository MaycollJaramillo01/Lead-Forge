import axios from "axios";
import { logUsage } from "@/lib/usage/log";

const URL = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";

export interface CruxResult {
  inCrux: boolean;
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
}

/** Pure: pull p75 metrics from a CrUX queryRecord response. */
export function parseCrux(data: any): CruxResult {
  const metrics = data?.record?.metrics;
  if (!metrics) return { inCrux: false, lcpMs: null, inpMs: null, cls: null };
  const lcp = metrics.largest_contentful_paint?.percentiles?.p75;
  const inp = metrics.interaction_to_next_paint?.percentiles?.p75;
  const cls = metrics.cumulative_layout_shift?.percentiles?.p75;
  return {
    inCrux: true,
    lcpMs: lcp != null ? Number(lcp) : null,
    inpMs: inp != null ? Number(inp) : null,
    cls: cls != null ? Number(cls) : null,
  };
}

/** Origin-level CrUX lookup. 404 => not enough traffic => inCrux=false. */
export async function queryCrux(origin: string): Promise<CruxResult> {
  const key = process.env.CRUX_API_KEY;
  if (!key) return { inCrux: false, lcpMs: null, inpMs: null, cls: null };
  try {
    const res = await axios.post(
      `${URL}?key=${key}`,
      { origin },
      { timeout: 20_000 },
    );
    await logUsage({ provider: "crux", endpoint: "queryRecord", httpStatus: res.status });
    return parseCrux(res.data);
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
    await logUsage({ provider: "crux", endpoint: "queryRecord", httpStatus: status });
    // 404 is the expected "not in dataset" signal — not an error condition.
    return { inCrux: false, lcpMs: null, inpMs: null, cls: null };
  }
}
