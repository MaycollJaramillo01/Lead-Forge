import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import { runNormalTask, runYelpTask } from "@/lib/tasks/runner";
import { z } from "zod";

const db = neon(process.env.DATABASE_URL!);

const CreateSchema = z.object({
  industry: z.string().min(1),
  state: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  county: z.string().optional(),
  radiusKm: z.number().optional(),
  provider: z.enum(["yelp", "overpass"]).default("overpass"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const location = [d.city, d.state, d.zip].filter(Boolean).join(", ") || "US";
  const keyword = d.industry;

  try {
    let result;
    if (d.provider === "yelp") {
      result = await runYelpTask(keyword, location, 50);
    } else {
      result = await runNormalTask(keyword, location, d.industry, d.city ?? "", d.state ?? "");
    }
    return NextResponse.json({ taskId: result.taskId, leadsCount: result.leadsCount }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await db`
    SELECT id, keyword, location, provider, status, leads_count, created_at, finished_at
    FROM scrape_tasks
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return NextResponse.json({ campaigns: tasks });
}
