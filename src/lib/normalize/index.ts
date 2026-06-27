import { parsePhoneNumberFromString } from "libphonenumber-js";

/** Lowercase, strip punctuation/legal suffixes, collapse whitespace. */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accent marks
    .replace(/\b(llc|inc|co|corp|ltd|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** URL/file-safe slug of a business name. */
export function slug(raw: string): string {
  return normalizeName(raw).replace(/\s+/g, "-");
}

/** Phone → E.164 (US default). Returns "" if unparseable. */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const parsed = parsePhoneNumberFromString(raw, "US");
  return parsed?.isValid() ? parsed.number : "";
}

/** Last 7 digits of a phone, used in the dedupe key. */
export function last7(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.slice(-7);
}

export function normalizeZip(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "").slice(0, 5);
}

/** dedupeKey = slug(name) | zip | last7(phone). Stable across sources. */
export function buildDedupeKey(
  name: string,
  zip: string | null | undefined,
  phone: string | null | undefined,
): string {
  return [slug(name), normalizeZip(zip), last7(normalizePhone(phone))].join("|");
}

/** Normalize a website URL; "" if absent/garbage. Lowercases host, adds https. */
export function normalizeWebsite(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.trim();
  if (!s || /^(n\/?a|none|null)$/i.test(s)) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

/** Extract registrable origin (scheme + host) for CrUX origin queries. */
export function originOf(websiteUrl: string): string | null {
  try {
    const u = new URL(websiteUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}
