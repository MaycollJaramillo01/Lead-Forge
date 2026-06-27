# LeadForge

Internal lead-generation platform: discovers local US businesses, audits their
digital presence, computes a **pain score** (how bad their web presence is — or
whether they have one), and surfaces the best prospects for web/SEO/landing-page
sales.

The core insight: the signal isn't perfect firmographic data, it's **digital
pain** — no website / slow site / not mobile-friendly / no HTTPS / cheap builder
/ low rating. That signal is free: OpenStreetMap (does it have a `website`?) +
PageSpeed Insights (is the site bad?).

## Stack

Next.js 15 (App Router, TS) · Neon Postgres · Prisma (Neon driver adapter) ·
Inngest (job orchestration) · NextAuth · Tailwind · Vitest · Vercel.

## Status

Implemented: **M1** (foundation) + **M2** (discovery) + the **M3** scoring core.

- `discover → normalize/dedupe → audit → score → enrich` Inngest pipeline
- Overpass (no key) + Geoapify adapters; PageSpeed / CrUX / Census / Hunter wired
- pain score (§9) + pg_trgm fuzzy dedupe + robots.txt-aware Cheerio audit
- `/leads`, `/campaigns` dashboard; REST under `/api`
- 26 unit tests (scoring, normalize, Overpass, audit parsers) — run with no creds

Not yet built (M4–M5): Census markets UI, CSV/Sheets/GoHighLevel export,
DoNotContact enforcement in export, budget-guard auto-degrade UI, reaudit cron
handler, Playwright SPA fallback.

## Setup

1. **Install**

   ```bash
   npm install
   npx prisma generate
   ```

2. **Neon** — create a project, copy both connection strings into `.env`
   (copy from `.env.example`):
   - `DATABASE_URL` = the **pooled** (`-pooler`) string (app runtime)
   - `DIRECT_URL` = the **direct** string (migrations)

3. **Migrate + enable pg_trgm**

   ```bash
   npx prisma migrate dev --name init          # creates tables (uses DIRECT_URL)
   psql "$DIRECT_URL" -f prisma/sql/001_pg_trgm.sql   # extension + GIN index
   npm run db:seed                             # categories ↔ NAICS ↔ OSM tags
   ```

4. **Auth** — set `AUTH_SECRET` (`openssl rand -base64 32`), `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`. Sign in at `/login`.

5. **Inngest** — `npx inngest-cli@latest dev` locally (points at
   `/api/inngest`); set `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` in prod.

6. **Run**

   ```bash
   npm run dev
   ```

## Try it

```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H 'content-type: application/json' \
  -d '{"state":"TX","city":"Dallas","industry":"roofing"}'
```

The campaign fans out: Overpass discovers roofers in the Dallas admin area
(no API key needed), they're deduped, audited, and scored. Watch them appear at
`/leads` (sorted by pain score). Businesses with no website score highest.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | `prisma generate` + production build |
| `npm test` | Vitest (no DB/credentials required) |
| `npm run db:seed` | Seed industry → NAICS/OSM categories |

## Compliance notes (see `src/lib/compliance`)

- robots.txt is checked before any Cheerio HTML fetch.
- Google Places / Yelp data must **not** be persisted (phase-2 stubs document this).
- Persistable data: OSM (© OpenStreetMap contributors) / Foursquare / Census / own audits.
- `source` + `captured_at` recorded on every `LeadSource` for traceability.
- `DoNotContact` must be consulted before any export (enforced in M4 export job).

## Secrets

`.env.example` is committed — keep **real keys out of it**. Put them in `.env`
(gitignored). Rotate any key that has been committed.
