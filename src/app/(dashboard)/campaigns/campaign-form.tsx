"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INDUSTRIES } from "@/lib/industry/map";

export function CampaignForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ leadsCount: number; taskId: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      industry: fd.get("industry"),
    };
    for (const k of ["state", "city", "zip", "county"]) {
      const v = (fd.get(k) as string)?.trim();
      if (v) body[k] = v;
    }
    const radius = (fd.get("radiusKm") as string)?.trim();
    if (radius) body.radiusKm = Number(radius);

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error === "validation" ? "Revisa los campos (necesitas ciudad, ZIP o centro+radio)." : `Error: ${j.error ?? "Intenta de nuevo."}`);
      return;
    }
    const { taskId, leadsCount } = await res.json();
    setSuccess({ leadsCount, taskId });
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border p-4 text-sm">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <select name="industry" required className="rounded border border-border px-2 py-1">
          {INDUSTRIES.map((i) => (
            <option key={i.slug} value={i.slug}>{i.name}</option>
          ))}
        </select>
        <input name="state" placeholder="Estado (TX)" maxLength={2} className="rounded border border-border px-2 py-1" />
        <input name="city" placeholder="Ciudad (Dallas)" className="rounded border border-border px-2 py-1" />
        <input name="zip" placeholder="ZIP (75201)" className="rounded border border-border px-2 py-1" />
        <input name="radiusKm" placeholder="Radio km (opcional)" className="rounded border border-border px-2 py-1" />
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {success && (
        <p className="text-green-700">
          ✓ {success.leadsCount} leads encontrados ·{" "}
          <a href={`/leads?task=${success.taskId}`} className="underline">
            Ver leads →
          </a>
        </p>
      )}
      <button
        disabled={submitting}
        className="rounded bg-primary px-4 py-1.5 text-white disabled:opacity-50"
      >
        {submitting ? "Ejecutando… (puede tomar hasta 90 seg)" : "Nueva tarea de scraping"}
      </button>
    </form>
  );
}
