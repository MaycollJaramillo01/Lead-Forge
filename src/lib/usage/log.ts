import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export function requestHash(parts: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 32);
}

interface LogArgs {
  provider: string;
  endpoint: string;
  httpStatus?: number;
  creditsUsed?: number;
  costUsd?: number;
  requestHash?: string;
  cached?: boolean;
}

/** Best-effort usage log; never throws (logging must not break a job). */
export async function logUsage(args: LogArgs): Promise<void> {
  try {
    await db.apiUsageLog.create({
      data: {
        provider: args.provider,
        endpoint: args.endpoint,
        httpStatus: args.httpStatus,
        creditsUsed: args.creditsUsed ?? 0,
        costUsd: args.costUsd ?? 0,
        requestHash: args.requestHash,
        cached: args.cached ?? false,
      },
    });
  } catch (err) {
    console.error("[usage] failed to log", args.provider, err);
  }
}

/**
 * Budget guard: returns true if today's request count for a provider is still
 * under its daily cap (env BUDGET_<PROVIDER>_DAILY). Used to degrade/pause
 * before burning a free tier.
 */
export async function withinDailyBudget(
  provider: string,
  envKey: string,
): Promise<boolean> {
  const cap = Number(process.env[envKey] ?? "0");
  if (!cap) return true; // no cap configured => allow
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const used = await db.apiUsageLog.count({
    where: { provider, cached: false, createdAt: { gte: since } },
  });
  return used < cap;
}
