import Link from "next/link";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const db = neon(process.env.DATABASE_URL!);

const STATUS_LABEL: Record<string, string> = {
  completed: "Completado",
  running: "Ejecutando",
  error: "Error",
  queued: "En cola",
};

export default async function DashboardPage() {
  const [
    [stats],
    nicheRows,
    dayRows,
    recentTasks,
  ] = await Promise.all([
    db`
      SELECT
        (SELECT COUNT(*)::int FROM leads)                                                    AS total_leads,
        (SELECT COUNT(*)::int FROM leads WHERE created_at > NOW() - INTERVAL '24 hours')    AS today_leads,
        (SELECT COUNT(*)::int FROM scrape_tasks WHERE status = 'completed')                 AS done_tasks,
        (SELECT COUNT(*)::int FROM scrape_tasks WHERE status = 'running')                   AS running_tasks
    `,
    db`
      SELECT COALESCE(t.keyword, l.source) AS niche, COUNT(l.id)::int AS count
      FROM leads l
      LEFT JOIN scrape_tasks t ON t.id = l.task_id
      GROUP BY COALESCE(t.keyword, l.source)
      ORDER BY count DESC
      LIMIT 8
    `,
    db`
      SELECT TO_CHAR(DATE(created_at), 'DD Mon') AS label,
             DATE(created_at)                    AS day,
             COUNT(*)::int                       AS count
      FROM leads
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at), label
      ORDER BY DATE(created_at)
    `,
    db`
      SELECT id, keyword, location, status, leads_count, created_at
      FROM scrape_tasks
      ORDER BY created_at DESC
      LIMIT 8
    `,
  ]);

  const maxNiche = Math.max(1, ...nicheRows.map((r) => Number(r.count)));
  const maxDay   = Math.max(1, ...dayRows.map((r)   => Number(r.count)));

  const totalLeads   = Number(stats?.total_leads   ?? 0);
  const todayLeads   = Number(stats?.today_leads   ?? 0);
  const doneTasks    = Number(stats?.done_tasks    ?? 0);
  const runningTasks = Number(stats?.running_tasks ?? 0);

  return (
    <div className="space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Lead Forge</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cleaning · Roofing · Construcción · Landscaping — empresas sin sitio web
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 divide-x divide-border border-y border-border sm:grid-cols-4">
        <Stat label="Total leads"       value={totalLeads} />
        <Stat label="Últimas 24 h"      value={todayLeads} />
        <Stat label="Tareas finalizadas" value={doneTasks} />
        <Stat label="En ejecución"      value={runningTasks} />
      </div>

      {/* Charts */}
      <div className="grid gap-8 md:grid-cols-2">

        {/* Leads por nicho */}
        <section>
          <h2 className="mb-4 text-sm font-medium">Leads por nicho</h2>
          {nicheRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin datos aún.{" "}
              <Link href="/campaigns" className="underline underline-offset-2">
                Lanzar primera tarea
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {nicheRows.map((r) => {
                const pct = Math.round((Number(r.count) / maxNiche) * 100);
                return (
                  <div key={String(r.niche)} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 truncate text-right text-muted-foreground capitalize">
                      {String(r.niche)}
                    </span>
                    <div className="flex-1 bg-muted" style={{ height: "6px" }}>
                      <div
                        className="h-full bg-foreground"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right tabular-nums">
                      {String(r.count)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Actividad últimos 7 días */}
        <section>
          <h2 className="mb-4 text-sm font-medium">Actividad últimos 7 días</h2>
          {dayRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
          ) : (
            <div className="flex h-24 items-end gap-2">
              {dayRows.map((r) => {
                const h = Math.max(2, Math.round((Number(r.count) / maxDay) * 80));
                return (
                  <div key={String(r.day)} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {Number(r.count)}
                    </span>
                    <div
                      className="w-full bg-foreground"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {String(r.label).split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Tareas recientes */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Tareas recientes</h2>
          <Link href="/campaigns" className="text-xs text-muted-foreground hover:underline underline-offset-2">
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Nicho</th>
                <th className="px-3 py-2 font-medium">Ubicación</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Leads</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {recentTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Sin tareas.{" "}
                    <Link href="/campaigns" className="underline underline-offset-2">
                      Crear primera tarea
                    </Link>
                  </td>
                </tr>
              )}
              {recentTasks.map((t) => (
                <tr key={String(t.id)} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2 capitalize">{String(t.keyword)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.location ? String(t.location) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {STATUS_LABEL[String(t.status)] ?? String(t.status)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {t.leads_count != null ? (
                      <Link
                        href={`/leads?task=${t.id}`}
                        className="hover:underline underline-offset-2"
                      >
                        {String(t.leads_count)}
                      </Link>
                    ) : (
                      "—"
                    )}
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-6 py-5">
      <p className="text-2xl font-semibold tabular-nums tracking-tight">
        {value.toLocaleString("es-MX")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
