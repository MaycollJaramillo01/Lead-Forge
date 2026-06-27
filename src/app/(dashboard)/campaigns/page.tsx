import Link from "next/link";
import { neon } from "@neondatabase/serverless";
import { CampaignForm } from "./campaign-form";
import { NicheForm } from "./niche-form";

export const dynamic = "force-dynamic";

const db = neon(process.env.DATABASE_URL!);

const STATUS_LABEL: Record<string, string> = {
  completed: "Completado",
  running:   "Ejecutando",
  error:     "Error",
  queued:    "En cola",
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
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Búsqueda</th>
              <th className="px-3 py-2 font-medium">Ubicación</th>
              <th className="px-3 py-2 font-medium">Proveedor</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Leads</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No hay tareas aún.
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr key={String(t.id)} className="border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2 font-medium capitalize">{String(t.keyword)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {t.location ? String(t.location) : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {String(t.provider)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {STATUS_LABEL[String(t.status)] ?? String(t.status)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  <Link href={`/leads?task=${t.id}`} className="hover:underline underline-offset-2">
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
                <td className="px-3 py-2">
                  {t.leads_count && Number(t.leads_count) > 0 && (
                    <a
                      href={`/api/leads/export?task=${t.id}`}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      CSV
                    </a>
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
