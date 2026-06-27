import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const db = neon(process.env.DATABASE_URL!);

export default async function LeadDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead] = await db`
    SELECT l.*, t.keyword, t.provider
    FROM leads l
    LEFT JOIN scrape_tasks t ON t.id = l.task_id
    WHERE l.id = ${id}
    LIMIT 1
  `;

  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <Link href="/leads" className="text-sm text-muted-foreground hover:underline">
        ← Leads
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{String(lead.name)}</h1>
        <p className="text-sm text-muted-foreground">
          {[lead.street, lead.city, lead.region, lead.postal_code]
            .filter(Boolean)
            .join(", ")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Contacto
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Teléfono" value={lead.phone} />
            <Row
              label="Website"
              value={
                lead.website ? (
                  <a
                    href={String(lead.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {String(lead.website)}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Sin website</span>
                )
              }
            />
            <Row label="Categoría" value={lead.category} />
            <Row label="Ciudad" value={lead.city} />
            <Row label="Estado" value={lead.region} />
            <Row label="ZIP" value={lead.postal_code} />
            <Row label="País" value={lead.country} />
            <Row
              label="Activo"
              value={lead.is_active ? "Sí" : "No"}
            />
          </dl>
        </section>

        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Fuente
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Proveedor" value={lead.source} />
            <Row label="Tarea" value={lead.keyword} />
            <Row label="Ubicación" value={lead.location} />
            {lead.latitude && lead.longitude && (
              <Row
                label="Coordenadas"
                value={`${Number(lead.latitude).toFixed(5)}, ${Number(lead.longitude).toFixed(5)}`}
              />
            )}
            <Row
              label="Capturado"
              value={
                lead.created_at
                  ? new Date(lead.created_at as string).toLocaleString("es-MX")
                  : null
              }
            />
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : value;

  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}:</dt>
      <dd>{typeof display === "object" && display !== null ? (display as React.ReactNode) : String(display)}</dd>
    </div>
  );
}
