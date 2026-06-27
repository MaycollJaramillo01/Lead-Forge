import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

const db = neon(process.env.DATABASE_URL!);

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (sp.state) { conditions.push(`region = $${idx++}`); values.push(sp.state); }
  if (sp.zip) { conditions.push(`postal_code = $${idx++}`); values.push(sp.zip); }
  if (sp.industry) { conditions.push(`category ILIKE $${idx++}`); values.push(`%${sp.industry}%`); }
  if (sp.source) { conditions.push(`source = $${idx++}`); values.push(sp.source); }
  if (sp.task) { conditions.push(`task_id = $${idx++}`); values.push(sp.task); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `
    SELECT name, category, city, region, postal_code, phone, website, source, created_at
    FROM leads ${where}
    ORDER BY created_at DESC
    LIMIT 5000
  `;

  const leads = values.length ? await db(query, values) : await db(query);

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = "Nombre,Categoría,Ciudad,Estado,ZIP,Teléfono,Website,Fuente,Fecha\n";
  const rows = leads
    .map((l) =>
      [l.name, l.category, l.city, l.region, l.postal_code, l.phone, l.website, l.source, l.created_at]
        .map(esc)
        .join(",")
    )
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads.csv"',
    },
  });
}
