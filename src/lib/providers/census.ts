import axios from "axios";
import { logUsage } from "@/lib/usage/log";

const URL = "https://api.census.gov/data/2022/zbp";

export interface CensusDensity {
  zip: string;
  naics: string;
  estabCount: number | null;
}

/**
 * U.S. Census ZIP Business Patterns: establishment count for a NAICS code in a
 * ZIP. Feeds market prioritization + the "high competition" pain-score signal.
 */
export async function getZbpDensity(
  zip: string,
  naics: string,
): Promise<CensusDensity> {
  try {
    const res = await axios.get(URL, {
      params: {
        get: "ESTAB",
        for: `zipcode:${zip}`,
        NAICS2017: naics,
        key: process.env.CENSUS_API_KEY || undefined,
      },
      timeout: 20_000,
    });
    await logUsage({ provider: "census", endpoint: "zbp", httpStatus: res.status });
    // Response is a 2D array: [["ESTAB","zipcode","NAICS2017"], ["42","75201","238160"]]
    const rows = res.data as string[][];
    const dataRow = Array.isArray(rows) ? rows[1] : undefined;
    const estab = dataRow ? Number(dataRow[0]) : null;
    return { zip, naics, estabCount: Number.isFinite(estab) ? estab : null };
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
    await logUsage({ provider: "census", endpoint: "zbp", httpStatus: status });
    return { zip, naics, estabCount: null };
  }
}
