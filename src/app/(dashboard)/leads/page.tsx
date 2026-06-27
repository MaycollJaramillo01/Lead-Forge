import Link from "next/link";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const db = neon(process.env.DATABASE_URL!);

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (sp.state) { conditions.push(`region = $${idx++}`); values.push(sp.state); }
  if (sp.zip) { conditions.push(`postal_code = $${idx++}`); values.push(sp.zip); }
  if (sp.industry) { conditions.push(`category ILIKE $${idx++}`); values.push(`%${sp.industry}%`); }
  if (sp.source) { conditions.push(`source = $${idx++}`); values.push(sp.source); }
  if (sp.task) { conditions.push(`task_id = $${idx++}`); values.push(sp.task); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const leadsQuery = `
    SELECT id, name, category, city, region, postal_code,
           website, phone, source, is_active, created_at
    FROM leads ${where}
    ORDER BY created_at DESC LIMIT 200
  `;

  const [leads, sources, tasks] = await Promise.all([
    values.length ? db(leadsQuery, values) : db(leadsQuery),
    db`SELECT DISTINCT source FROM leads ORDER BY source`,
    db`SELECT id, keyword, location FROM scrape_tasks ORDER BY created_at DESC LIMIT 50`,
  ]);

  const exportParams = new URLSearchParams();
  if (sp.state) exportParams.set("state", sp.state);
  if (sp.zip) exportParams.set("zip", sp.zip);
  if (sp.industry) exportParams.set("industry", sp.industry);
  if (sp.source) exportParams.set("source", sp.source);
  if (sp.task) exportParams.set("task", sp.task);
  const exportUrl = `/api/leads/export?${exportParams}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <a
          href={exportUrl}
          className="rounded border border-border px-3 py-1 text-sm hover:bg-muted"
        >
          Descargar CSV
        </a>
      </div>

      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input
          name="state"
          defaultValue={sp.state}
          placeholder="Estado (TX)"
          className="rounded border border-border px-2 py-1"
        />
        <input
          name="zip"
          defaultValue={sp.zip}
          placeholder="ZIP"
          className="rounded border border-border px-2 py-1"
        />
        <input
          name="industry"
          defaultValue={sp.industry}
          placeholder="Categoría"
          className="rounded border border-border px-2 py-1"
        />
        <select
          name="source"
          defaultValue={sp.source ?? ""}
          className="rounded border border-border px-2 py-1"
        >
          <option value="">Todas las fuentes</option>
          {sources.map((s) => (
            <option key={String(s.source)} value={String(s.source)}>
              {String(s.source)}
            </option>
          ))}
        </select>
        <select
          name="task"
          defaultValue={sp.task ?? ""}
          className="rounded border border-border px-2 py-1"
        >
          <option value="">Todas las tareas</option>
          {tasks.map((t) => (
            <option key={String(t.id)} value={String(t.id)}>
              {String(t.keyword)} — {String(t.location)}
            </option>
          ))}
        </select>
        <button className="rounded bg-primary px-3 py-1 text-white">Filtrar</button>
        {(sp.state || sp.zip || sp.industry || sp.source || sp.task) && (
          <Link
            href="/leads"
            className="rounded border border-border px-3 py-1 text-muted-foreground hover:bg-muted"
          >
            Limpiar
          </Link>
        )}
      </form>

      <p className="mb-2 text-sm text-muted-foreground">{leads.length} leads encontrados</p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Negocio</th>
              <th className="px-3 py-2">Ciudad</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Fuente</th>
              <th className="px-3 py-2">Web</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Activo</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No hay leads.{" "}
                  <Link href="/campaigns" className="text-primary hover:underline">
                    Ejecuta una tarea →
                  </Link>
                </td>
              </tr>
            )}
            {leads.map((l) => (
              <tr key={String(l.id)} className="border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:underline">
                    {String(l.name)}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {l.city ? String(l.city) : "—"}
                  {l.region ? `, ${l.region}` : ""}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {l.category ? String(l.category) : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{String(l.source)}</span>
                </td>
                <td className="px-3 py-2">
                  {l.website ? (
                    <a
                      href={String(l.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      ✓
                    </a>
                  ) : (
                    <span className="text-muted-foreground">✗</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {l.phone ? String(l.phone) : "—"}
                </td>
                <td className="px-3 py-2">
                  {l.is_active ? (
                    <span className="text-green-600">●</span>
                  ) : (
                    <span className="text-muted-foreground">○</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
