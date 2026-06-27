import axios from "axios";

const cache = new Map<string, { allowAll: boolean; disallow: string[]; ts: number }>();
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

/** Minimal robots.txt parser for our own user-agent (treat * as us). */
function parseRobots(body: string): { disallow: string[] } {
  const lines = body.split(/\r?\n/);
  const disallow: string[] = [];
  let applies = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.toLowerCase().trim();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      applies = val === "*";
    } else if (key === "disallow" && applies && val) {
      disallow.push(val);
    }
  }
  return { disallow };
}

/**
 * Returns true if we are allowed to fetch `targetUrl`'s HTML per robots.txt.
 * On any error (no robots, network failure) we default to ALLOW for the
 * homepage path only — conservative but not blocking legitimate audits.
 */
export async function isFetchAllowed(targetUrl: string): Promise<boolean> {
  let origin: string;
  let path: string;
  try {
    const u = new URL(targetUrl);
    origin = `${u.protocol}//${u.host}`;
    path = u.pathname || "/";
  } catch {
    return false;
  }

  const now = Date.now();
  let entry = cache.get(origin);
  if (!entry || now - entry.ts > TTL_MS) {
    try {
      const res = await axios.get(`${origin}/robots.txt`, {
        timeout: 10_000,
        validateStatus: () => true,
      });
      if (res.status >= 200 && res.status < 300 && typeof res.data === "string") {
        const { disallow } = parseRobots(res.data);
        entry = { allowAll: disallow.length === 0, disallow, ts: now };
      } else {
        entry = { allowAll: true, disallow: [], ts: now };
      }
    } catch {
      entry = { allowAll: true, disallow: [], ts: now };
    }
    cache.set(origin, entry);
  }

  if (entry.allowAll) return true;
  // Disallowed if any rule is a prefix of our path (or "/" blocks everything).
  return !entry.disallow.some((rule) => rule === "/" || path.startsWith(rule));
}
