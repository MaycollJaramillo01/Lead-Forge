import { neon } from "@neondatabase/serverless";
import { fetchYelpByKeyword } from "@/lib/providers/yelp";
import { buildOverpassQL, parseOverpassResponse } from "@/lib/providers/overpass";
import axios from "axios";

const sql = () => neon(process.env.DATABASE_URL!);

export interface TaskResult {
  taskId: string;
  leadsCount: number;
  status: "completed" | "error";
  error?: string;
}

// ─── Task: Yelp ──────────────────────────────────────────────────────────────

export async function runYelpTask(
  keyword: string,
  location: string,
  maxLeads = 50,
): Promise<TaskResult> {
  const db = sql();

  // Create task record
  const [task] = await db`
    INSERT INTO scrape_tasks (keyword, location, provider, status, sources)
    VALUES (${keyword}, ${location}, 'yelp', 'running', ARRAY['yelp'])
    RETURNING id
  `;
  const taskId = task.id as string;

  try {
    const leads = await fetchYelpByKeyword(keyword, location, maxLeads);

    if (leads.length > 0) {
      // Bulk insert leads
      for (const lead of leads) {
        await db`
          INSERT INTO leads (
            task_id, source, name, phone, website,
            street, city, region, postal_code, address,
            category, source_url, keyword, location, country,
            is_active, latitude, longitude
          ) VALUES (
            ${taskId}, 'yelp', ${lead.name}, ${lead.phone}, '',
            ${lead.street}, ${lead.city}, ${lead.state}, ${lead.zip}, ${lead.address},
            ${lead.category}, ${lead.yelp_url}, ${keyword}, ${location}, 'US',
            ${lead.is_active}, ${lead.latitude}, ${lead.longitude}
          )
          ON CONFLICT DO NOTHING
        `;
      }
    }

    await db`
      UPDATE scrape_tasks
      SET status = 'completed', leads_count = ${leads.length}, finished_at = NOW()
      WHERE id = ${taskId}
    `;

    return { taskId, leadsCount: leads.length, status: "completed" };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await db`
      UPDATE scrape_tasks
      SET status = 'error', review_reason = ${error}, finished_at = NOW()
      WHERE id = ${taskId}
    `;
    return { taskId, leadsCount: 0, status: "error", error };
  }
}

// ─── Task: Normal (Overpass/OSM) ─────────────────────────────────────────────

export async function runNormalTask(
  keyword: string,
  location: string,
  industry: string,
  city: string,
  state: string,
): Promise<TaskResult> {
  const db = sql();

  const [task] = await db`
    INSERT INTO scrape_tasks (keyword, location, provider, status, sources)
    VALUES (${keyword}, ${location}, 'overpass', 'running', ARRAY['openstreetmap'])
    RETURNING id
  `;
  const taskId = task.id as string;

  try {
    const ql = buildOverpassQL(industry, { industry, city, state });
    const endpoint =
      process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";

    const res = await axios.post(
      endpoint,
      `data=${encodeURIComponent(ql)}`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 90_000,
      },
    );

    const leads = parseOverpassResponse(res.data, industry);

    // Filter: only businesses without website (matching task intent)
    const noWebsite = leads.filter((l) => !l.website);

    for (const lead of noWebsite) {
      await db`
        INSERT INTO leads (
          task_id, source, name, phone, website,
          street, city, region, postal_code, address,
          category, keyword, location, country,
          is_active, latitude, longitude
        ) VALUES (
          ${taskId}, 'openstreetmap', ${lead.business_name}, ${lead.phone}, ${lead.website || ''},
          ${lead.address}, ${lead.city}, ${lead.state}, ${lead.zip}, ${lead.address},
          ${lead.category}, ${keyword}, ${location}, 'US',
          true, ${lead.latitude ? parseFloat(lead.latitude) : null},
          ${lead.longitude ? parseFloat(lead.longitude) : null}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    await db`
      UPDATE scrape_tasks
      SET status = 'completed', leads_count = ${noWebsite.length}, finished_at = NOW()
      WHERE id = ${taskId}
    `;

    return { taskId, leadsCount: noWebsite.length, status: "completed" };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await db`
      UPDATE scrape_tasks
      SET status = 'error', review_reason = ${error}, finished_at = NOW()
      WHERE id = ${taskId}
    `;
    return { taskId, leadsCount: 0, status: "error", error };
  }
}
