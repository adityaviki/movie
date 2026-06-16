# Movie Library

A personal, self-hosted movie and TV catalogue built from the public IMDb
datasets, with a watchlist, a watched log, and the kind of filtering the
streaming apps never give you.

Every streaming app has a "browse" page built to keep you scrolling, not to help
you find the one film you actually want to watch tonight. This is the opposite: a
quiet, fast catalogue you own, where "well-rated thrillers from the 90s I haven't
seen yet" is a query, not a recommendation carousel.

![Movie Library browse page: a poster grid with a filter sidebar for rating, year, genre, people, and type](docs/screenshot.png)

## Features

- **Real filtering.** Search by title; narrow by genre, type, year range, rating,
  and the people involved (director, writer, producer, cast); then sort the
  result. The whole filter state lives in the URL, so any view is a link you can
  bookmark or share.
- **A library that's yours.** Flag any title into a watchlist or mark it watched,
  scoped per user. Toggle the library filters and the catalogue becomes "things I
  want to see" or "things I've already seen" on demand.
- **A self-maintaining dataset.** A scheduled sync downloads the IMDb dumps,
  keeps only titles above a rating and vote threshold, and backfills posters and
  plot summaries from OMDb within a daily quota — no manual upkeep.

## Tech stack

- **Backend** — [Fastify 5](https://fastify.dev) + [Drizzle ORM](https://orm.drizzle.team)
  over **Postgres**, with JWT cookie auth (`@fastify/jwt` + `@fastify/cookie`,
  signed), CORS, and per-route rate limiting.
- **Frontend** — **React 19** + **Vite 6** + **Tailwind v4**, with
  [TanStack Query](https://tanstack.com/query) for data fetching, Radix UI
  primitives, `react-router-dom`, and `next-themes` for dark mode.
- **Shared** — a small workspace package of TypeScript types shared by both ends.
- **Data** — a streaming IMDb importer that gunzips and parses the TSV dumps line
  by line (so the sync never holds a multi-gigabyte file in memory), enriched
  with [OMDb](https://www.omdbapi.com).

## Repository layout

```
packages/
├── backend/    Fastify API, Drizzle schema, IMDb/OMDb sync scripts
├── frontend/   React + Vite SPA
└── shared/     TypeScript types shared across the workspace
deploy/         Lightsail provisioning, Caddy config, systemd units (see deploy/README.md)
```

The data model is five tables: `Movie`, `Person`, `MovieCredit` (the cast/crew
join), `User`, and `UserMovie` (per-user watchlist/watched state).

## Getting started (local development)

### Prerequisites

- Node 20+ and [pnpm](https://pnpm.io)
- A Postgres database
- *(optional)* an [OMDb API key](https://www.omdbapi.com/apikey.aspx) if you want
  to enrich titles with posters and plot summaries

### 1. Install

```bash
pnpm install
```

### 2. Configure the backend

Create `packages/backend/.env`:

```ini
DATABASE_URL=postgres://user:pass@127.0.0.1:5432/movie
JWT_SECRET=run: openssl rand -hex 32
COOKIE_SECRET=run: openssl rand -hex 32
# Optional — defaults shown:
PORT=7070
FRONTEND_URL=http://localhost:7071

# Optional — only needed for the data sync:
OMDB_API_KEY=your_key
OMDB_MAX_CALLS_PER_RUN=800
IMDB_CACHE_DIR=./.imdb-cache
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string | — (required) |
| `JWT_SECRET` | Signs the auth JWT | — (required) |
| `COOKIE_SECRET` | Signs the auth cookie | — (required) |
| `PORT` | Backend listen port | `7070` |
| `FRONTEND_URL` | CORS origin for the SPA | `http://localhost:7071` |
| `OMDB_API_KEY` | Enables OMDb enrichment during sync | unset (sync skips enrichment) |
| `OMDB_MAX_CALLS_PER_RUN` | Caps OMDb calls per sync run | — |
| `IMDB_CACHE_DIR` | Where IMDb dumps are cached | — |

### 3. Create the schema

```bash
pnpm --filter @movie/backend db:migrate   # or db:push for a quick local sync
```

### 4. Seed a user

Set `SEED_USER_EMAIL`, `SEED_USER_USERNAME`, and `SEED_USER_PASSWORD` in the env
(there's no public sign-up — this is a single-tenant app), then:

```bash
pnpm --filter @movie/backend db:seed
```

### 5. Load some data (optional)

```bash
pnpm --filter @movie/backend sync:imdb            # titles + ratings
pnpm --filter @movie/backend sync:imdb:backfill   # also pull cast/crew (downloads ~2GB)
```

The sync keeps titles above ~7.0 rating with 30k+ votes across a fixed set of
title types, then backfills posters and descriptions from OMDb up to the per-run
cap. Without an `OMDB_API_KEY` it still imports titles and ratings, just without
the artwork.

### 6. Run

```bash
pnpm dev
```

This starts both packages in parallel: the API on `http://localhost:7070` and the
Vite dev server on `http://localhost:7071` (which proxies `/api` to the backend).

## Available scripts

Run with `pnpm --filter @movie/backend <script>` (or `@movie/frontend`):

| Script | Package | What it does |
| --- | --- | --- |
| `dev` | root | Runs backend + frontend in parallel |
| `build` | root | Builds every package |
| `db:push` / `db:generate` / `db:migrate` | backend | Drizzle Kit schema workflow |
| `db:seed` | backend | Creates the admin user from `SEED_USER_*` |
| `sync:imdb` / `sync:imdb:backfill` | backend | IMDb + OMDb data sync |
| `dev` / `build` / `preview` | frontend | Vite dev / production build / preview |

## Deployment

The production setup runs on a single Ubuntu Lightsail box: **Caddy** terminates
TLS and serves the built frontend while reverse-proxying `/api`, the **Fastify
backend** and **Postgres** run under systemd, and the IMDb sync runs nightly via a
systemd timer. Full step-by-step instructions are in
[`deploy/README.md`](deploy/README.md).

## Data attribution

Title and credit data comes from the
[IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/);
posters and plot summaries come from [OMDb](https://www.omdbapi.com). This is a
personal, non-commercial project.
