"use client";

import { useState } from "react";

const NICHES = [
  { slug: "cleaning", label: "Cleaning" },
  { slug: "roofing", label: "Roofing" },
  { slug: "contractors", label: "Construcción" },
  { slug: "landscaping", label: "Landscaping" },
];

type NicheStatus = {
  status: "idle" | "running" | "done" | "error";
  count?: number;
  taskId?: string;
  error?: string;
};

export function NicheForm() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [results, setResults] = useState<Record<string, NicheStatus>>({});

  const anyRunning = Object.values(results).some((r) => r.status === "running");
  const hasLocation = city.trim() || state.trim();

  async function launchNiche(slug: string) {
    if (!hasLocation) return;
    setResults((r) => ({ ...r, [slug]: { status: "running" } }));
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: slug, city, state, provider: "yelp" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Error al ejecutar la tarea");
      }
      const { taskId, leadsCount } = await res.json();
      setResults((r) => ({ ...r, [slug]: { status: "done", count: leadsCount, taskId } }));
    } catch (err) {
      setResults((r) => ({ ...r, [slug]: { status: "error", error: String(err) } }));
    }
  }

  function launchAll() {
    NICHES.forEach((n) => {
      if (results[n.slug]?.status !== "running") launchNiche(n.slug);
    });
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div>
        <p className="text-sm font-medium">Nicho predefinido — Yelp · sin sitio web</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ingresa una ubicación y lanza uno o todos los nichos.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ciudad (Dallas)"
          className="rounded border border-border px-2 py-1"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          placeholder="Estado (TX)"
          maxLength={2}
          className="w-24 rounded border border-border px-2 py-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {NICHES.map((n) => {
          const r = results[n.slug];
          const isRunning = r?.status === "running";
          const isDone = r?.status === "done";
          const isError = r?.status === "error";
          return (
            <button
              key={n.slug}
              onClick={() => launchNiche(n.slug)}
              disabled={isRunning || !hasLocation}
              className="flex flex-col items-start gap-1 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted disabled:opacity-40 text-left transition-colors"
            >
              <span className="font-medium">{n.label}</span>
              {isRunning && (
                <span className="text-xs text-muted-foreground">Ejecutando…</span>
              )}
              {isDone && (
                <a
                  href={`/leads?task=${r.taskId}`}
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.count} leads encontrados
                </a>
              )}
              {isError && (
                <span className="text-xs text-red-500">Error al ejecutar</span>
              )}
            </button>
          );
        })}
      </div>

      {!hasLocation && (
        <p className="text-xs text-muted-foreground">
          Ingresa ciudad o estado para activar las tareas.
        </p>
      )}

      <button
        onClick={launchAll}
        disabled={anyRunning || !hasLocation}
        className="rounded border border-border px-4 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
      >
        {anyRunning ? "Ejecutando… (1–2 min por nicho)" : "Lanzar los 4 nichos"}
      </button>
    </div>
  );
}
