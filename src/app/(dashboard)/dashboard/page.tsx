import Link from "next/link";
import { neon } from "@neondatabase/serverless";
import { ArrowRight, CheckCircle2, Clock3, Layers3, Plus, UsersRound, Zap } from "lucide-react";

export const dynamic = "force-dynamic";
const db = neon(process.env.DATABASE_URL!);

const STATUS: Record<string, { label: string; className: string }> = {
  completed: { label: "Completado", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  running: { label: "Ejecutando", className: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  error: { label: "Error", className: "bg-red-50 text-red-700 ring-red-600/20" },
  queued: { label: "En cola", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
};

export default async function DashboardPage() {
  const [[stats], nicheRows, dayRows, recentTasks] = await Promise.all([
    db`SELECT
      (SELECT COUNT(*)::int FROM leads) AS total_leads,
      (SELECT COUNT(*)::int FROM leads WHERE created_at > NOW() - INTERVAL '24 hours') AS today_leads,
      (SELECT COUNT(*)::int FROM scrape_tasks WHERE status = 'completed') AS done_tasks,
      (SELECT COUNT(*)::int FROM scrape_tasks WHERE status = 'running') AS running_tasks`,
    db`SELECT COALESCE(t.keyword, l.source) AS niche, COUNT(l.id)::int AS count
      FROM leads l LEFT JOIN scrape_tasks t ON t.id = l.task_id
      GROUP BY COALESCE(t.keyword, l.source) ORDER BY count DESC LIMIT 6`,
    db`SELECT TO_CHAR(DATE(created_at), 'DD Mon') AS label, DATE(created_at) AS day, COUNT(*)::int AS count
      FROM leads WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at), label ORDER BY DATE(created_at)`,
    db`SELECT id, keyword, location, status, leads_count, created_at
      FROM scrape_tasks ORDER BY created_at DESC LIMIT 7`,
  ]);

  const maxNiche = Math.max(1, ...nicheRows.map((row) => Number(row.count)));
  const maxDay = Math.max(1, ...dayRows.map((row) => Number(row.count)));
  const values = {
    total: Number(stats?.total_leads ?? 0),
    today: Number(stats?.today_leads ?? 0),
    completed: Number(stats?.done_tasks ?? 0),
    running: Number(stats?.running_tasks ?? 0),
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Centro de operaciones</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">Resumen general</h1>
          <p className="mt-2 text-sm text-muted-foreground">Rendimiento de tus campañas y actividad reciente.</p>
        </div>
        <Link href="/campaigns" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#102baf]">
          <Plus className="h-4 w-4" /> Nueva campaña
        </Link>
      </header>

      <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={UsersRound} label="Total de leads" value={values.total} featured />
        <Stat icon={Zap} label="Nuevos en 24 horas" value={values.today} />
        <Stat icon={CheckCircle2} label="Tareas finalizadas" value={values.completed} />
        <Stat icon={Clock3} label="En ejecución" value={values.running} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div><h2 className="font-semibold">Leads por nicho</h2><p className="mt-1 text-sm text-muted-foreground">Distribución de oportunidades encontradas</p></div>
            <Layers3 className="h-5 w-5 text-primary" />
          </div>
          {nicheRows.length === 0 ? <EmptyState message="Aún no hay datos por nicho." /> : (
            <div className="space-y-5">
              {nicheRows.map((row) => {
                const percent = Math.round((Number(row.count) / maxNiche) * 100);
                return (
                  <div key={String(row.niche)}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span className="truncate font-medium capitalize">{String(row.niche)}</span>
                      <span className="tabular-nums text-muted-foreground">{Number(row.count).toLocaleString("es-MX")}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="mb-8"><h2 className="font-semibold">Actividad semanal</h2><p className="mt-1 text-sm text-muted-foreground">Leads añadidos durante los últimos 7 días</p></div>
          {dayRows.length === 0 ? <EmptyState message="Sin actividad reciente." /> : (
            <div className="flex h-48 items-end gap-3 border-b border-border pt-4">
              {dayRows.map((row) => {
                const height = Math.max(8, Math.round((Number(row.count) / maxDay) * 148));
                return (
                  <div key={String(row.day)} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{Number(row.count)}</span>
                    <div className="w-full max-w-10 rounded-t-md bg-primary/80 group-hover:bg-primary" style={{ height }} />
                    <span className="pb-3 text-[11px] text-muted-foreground">{String(row.label).split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div><h2 className="font-semibold">Tareas recientes</h2><p className="mt-1 text-sm text-muted-foreground">Últimas ejecuciones del equipo</p></div>
          <Link href="/campaigns" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:text-[#102baf]">Ver todas <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-6 py-3 font-semibold">Nicho</th><th className="px-6 py-3 font-semibold">Ubicación</th><th className="px-6 py-3 font-semibold">Estado</th><th className="px-6 py-3 font-semibold">Leads</th><th className="px-6 py-3 font-semibold">Fecha</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentTasks.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No hay tareas todavía.</td></tr>}
              {recentTasks.map((task) => {
                const state = STATUS[String(task.status)] ?? { label: String(task.status), className: "bg-muted text-muted-foreground ring-slate-500/20" };
                return (
                  <tr key={String(task.id)} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-medium capitalize">{String(task.keyword)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{task.location ? String(task.location) : "—"}</td>
                    <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${state.className}`}>{state.label}</span></td>
                    <td className="px-6 py-4 font-medium tabular-nums"><Link href={`/leads?task=${task.id}`} className="text-primary hover:underline">{task.leads_count != null ? String(task.leads_count) : "—"}</Link></td>
                    <td className="px-6 py-4 text-muted-foreground">{task.created_at ? new Date(task.created_at as string).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, featured = false }: { icon: typeof UsersRound; label: string; value: number; featured?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${featured ? "border-primary bg-primary text-white" : "border-border bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <p className={`text-sm font-medium ${featured ? "text-blue-100" : "text-muted-foreground"}`}>{label}</p>
        <span className={`rounded-lg p-2 ${featured ? "bg-white/10" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-6 text-3xl font-semibold tabular-nums tracking-[-0.03em]">{value.toLocaleString("es-MX")}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex min-h-40 items-center justify-center rounded-xl bg-muted px-6 text-center text-sm text-muted-foreground">{message}</div>;
}
