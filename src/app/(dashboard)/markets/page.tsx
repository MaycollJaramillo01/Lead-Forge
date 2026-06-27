export default function MarketsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Markets</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Census ZIP-level establishment density (M4). The provider is wired in
        <code className="mx-1">src/lib/providers/census.ts</code>; this view lands with the
        enrichment + export milestone.
      </p>
    </div>
  );
}
