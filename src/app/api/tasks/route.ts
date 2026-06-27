import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import { runYelpTask, runNormalTask } from "@/lib/tasks/runner";
import { z } from "zod";

const db = neon(process.env.DATABASE_URL!);

const CreateTaskSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("yelp"),
    keyword: z.string().min(1),
    location: z.string().min(1),
    maxLeads: z.number().int().min(1).max(200).default(50),
  }),
  z.object({
    type: z.literal("normal"),
    keyword: z.string().min(1),
    location: z.string().min(1),
    industry: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
  }),
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  try {
    let result;
    if (input.type === "yelp") {
      result = await runYelpTask(input.keyword, input.location, input.maxLeads);
    } else {
      result = await runNormalTask(
        input.keyword,
        input.location,
        input.industry,
        input.city,
        input.state,
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
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
    LIMIT 50
  `;
  return NextResponse.json(tasks);
}
