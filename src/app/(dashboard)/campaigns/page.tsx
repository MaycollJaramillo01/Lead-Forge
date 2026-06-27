import Link from "next/link";
import { neon } from "@neondatabase/serverless";
import { CampaignForm } from "./campaign-form";
import { NicheForm } from "./niche-form";

export const dynamic = "force-dynamic";

const db = neon(process.env.DATABASE_URL!);

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  error: "bg-red-100 text-red-700",
  queued: "bg-amber-100 text-amber-700",
};

export default async function CampaignsPage() {
  const tasks = await db`
    SELECT id, keyword, location, provider, status, leads_count, created_at, finished_at, notes
    FROM scrape_tasks
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Campañas</h1>
      <NicheForm />
      <CampaignForm />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Búsqueda</th>
              <th className="px-3 py-2">Ubicación</th>
              <th className="px-3 py-2">Proveedor</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Leads</th>
              <th className="px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No hay tareas aún.
                </td>
              </tr>
            )}
            {tasks.map((t) => {
              const status = String(t.status);
              const badgeClass =
                STATUS_COLOR[status] ?? "bg-slate-100 text-slate-600";
              return (
                <tr key={String(t.id)} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium">{String(t.keyword)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.location ? String(t.location) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {String(t.provider)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    <Link
                      href={`/leads?task=${t.id}`}
                      className="hover:underline"
                    >
                      {t.leads_count != null ? String(t.leads_count) : "0"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.created_at
                      ? new Date(t.created_at as string).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
