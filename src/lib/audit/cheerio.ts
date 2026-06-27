import axios from "axios";
import * as cheerio from "cheerio";
import { isFetchAllowed } from "@/lib/compliance/robots";

export interface CheerioAudit {
  reachable: boolean;
  httpStatus: number | null;
  hasHttps: boolean;
  hasViewportMeta: boolean;
  hasContactForm: boolean;
  cms: string | null; // Wix | Squarespace | Weebly | GoDaddy | WordPress | ...
  cheapBuilder: boolean;
  robotsBlocked: boolean;
}

const CHEAP_BUILDERS = ["Wix", "Weebly", "GoDaddy", "Squarespace"];

/** Pure: detect tech + mobile/contact signals from raw HTML. Unit-tested. */
export function analyzeHtml(html: string, finalUrl: string): Omit<CheerioAudit, "reachable" | "httpStatus" | "robotsBlocked"> {
  const $ = cheerio.load(html);
  const hasViewportMeta = $('meta[name="viewport"]').length > 0;
  const hasContactForm =
    $("form").length > 0 ||
    $('input[type="email"]').length > 0 ||
    /contact/i.test($('a[href*="contact"]').text());

  const generator = ($('meta[name="generator"]').attr("content") ?? "").trim();
  const lowerHtml = html.toLowerCase();
  let cms: string | null = null;
  if (/wix\.com|_wix|wixstatic/.test(lowerHtml) || /wix/i.test(generator)) cms = "Wix";
  else if (/squarespace/.test(lowerHtml) || /squarespace/i.test(generator)) cms = "Squarespace";
  else if (/weebly/.test(lowerHtml) || /weebly/i.test(generator)) cms = "Weebly";
  else if (/godaddy|websitebuilder/.test(lowerHtml)) cms = "GoDaddy";
  else if (/wp-content|wordpress/.test(lowerHtml) || /wordpress/i.test(generator)) cms = "WordPress";
  else if (/shopify/.test(lowerHtml)) cms = "Shopify";

  return {
    hasHttps: finalUrl.startsWith("https://"),
    hasViewportMeta,
    hasContactForm,
    cms,
    cheapBuilder: cms != null && CHEAP_BUILDERS.includes(cms),
  };
}

const EMPTY: CheerioAudit = {
  reachable: false,
  httpStatus: null,
  hasHttps: false,
  hasViewportMeta: false,
  hasContactForm: false,
  cms: null,
  cheapBuilder: false,
  robotsBlocked: false,
};

/** Fetch + analyze a homepage (respecting robots.txt). Never throws. */
export async function auditWithCheerio(url: string): Promise<CheerioAudit> {
  if (!(await isFetchAllowed(url))) {
    return { ...EMPTY, robotsBlocked: true };
  }
  try {
    const res = await axios.get<string>(url, {
      timeout: 15_000,
      maxRedirects: 5,
      responseType: "text",
      validateStatus: () => true,
      headers: { "User-Agent": "LeadForgeBot/1.0 (+audit)" },
    });
    const finalUrl = (res.request?.res?.responseUrl as string) ?? url;
    if (res.status >= 400 || typeof res.data !== "string") {
      return { ...EMPTY, reachable: res.status < 400, httpStatus: res.status, hasHttps: finalUrl.startsWith("https://") };
    }
    const analyzed = analyzeHtml(res.data, finalUrl);
    return { reachable: true, httpStatus: res.status, robotsBlocked: false, ...analyzed };
  } catch {
    return EMPTY;
  }
}
