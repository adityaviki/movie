# Release readiness — going from "just for me" to public

This project was built as a single-tenant personal app. This doc lists what to
change or decide before releasing it for others. Items are grouped by theme and
roughly ordered by urgency. File references point at the exact spots to touch.

---

## 0. Decide this first — it changes everything

### 0.1 What does "release for others" mean?

There are two very different targets, and most decisions below depend on which you pick:

- **A — Self-host / open source.** Others clone the repo and run their *own*
  instance (their own DB, their own seeded user). This is the natural fit for the
  current architecture and needs the *least* change. No public sign-up required —
  each operator seeds their own user, exactly as you do today.
- **B — Public hosted service.** You (or they) run one instance that *many*
  strangers sign up to and share. This needs real registration, email
  verification, abuse protection, and runs straight into the IMDb licensing
  ceiling below.

**Recommendation: target A first.** It's a small, honest step from where you are,
and it sidesteps the legal problem in 0.2. Treat B as a separate, later project.

### 0.2 The IMDb licensing ceiling (read before choosing B)

Title/credit data comes from the **IMDb non-commercial datasets**, which are
licensed for **personal and non-commercial use only** (documented in `README.md`).
Implications:

- Self-hosters running it for personal use (model A) are fine.
- A **public or commercial** deployment (model B, ads, paid hosting, company use)
  **violates IMDb's terms.** No code change fixes this — it's a data-license cap.
- OMDb's free tier is ~1,000 requests/day and also has commercial restrictions.

If you ever want B to be legitimate, you'd need a commercially-licensed data
source (e.g. TMDB under its terms, or a paid IMDb/licensed feed) — note that
TMDB does **not** carry IMDb ratings/votes, so your `MIN_RATING`/`MIN_VOTES`
filter would change meaning. Document this constraint prominently either way.

---

## 1. Secrets & sensitive data (do before the first public push)

- [ ] **Rotate the leaked OMDb key.** `deploy/systemd/movie-sync.env.example:5`
      hardcodes `OMDB_API_KEY=950b9f99`; it's also in history (commit `afbb3d9`).
      Get a new key, replace the value in the `.example` with a placeholder
      (`OMDB_API_KEY=your_omdb_key`), and consider scrubbing history
      (`git filter-repo`) or accept that the *old* (now-rotated) key is burned.
- [ ] **Audit history for any other secrets** before publishing
      (`git log -p -- '*.env*'`). Once public, history is forever.
- [ ] **Confirm `.gitignore` covers real env files** — it does (`.env*`), so your
      local `packages/backend/.env` with dev `JWT_SECRET`/`COOKIE_SECRET` is not
      tracked. Keep it that way; never commit a real `.env`.
- [ ] **Ship a `packages/backend/.env.example`** (currently missing) so newcomers
      know every required/optional var without reading source. Include
      `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `FRONTEND_URL`, `PORT`,
      `OMDB_API_KEY`, `OMDB_MAX_CALLS_PER_RUN`, `IMDB_CACHE_DIR`, and the
      `SEED_USER_*` trio — all with safe placeholders.

---

## 2. Remove personal / hardcoded identifiers

A fork shouldn't carry your name, domain, or server. Replace these with
placeholders, a template, or env-driven values:

| What | Where |
| --- | --- |
| Personal domain `movies.adityaviki.com` | `deploy/Caddyfile:6,29`; `.github/workflows/deploy.yml:52-54`; `deploy/README.md` (several) |
| GitHub clone URL `github.com/adityaviki/movie` | `deploy/README.md:39` |
| Server IP `13.232.16.216` | `deploy/README.md:19` |
| Postgres user `adityaviki`, DB `movie_manager` | local `.env` default — give the `.env.example` a generic `postgres://movie:movie@localhost:5432/movie` |
| Hardcoded deploy paths `/home/ubuntu/movie` | `deploy/systemd/*.service` (documented as editable, but make it a template) |

**Suggestion:** turn `deploy/Caddyfile` into `Caddyfile.template` with a `{{DOMAIN}}`
placeholder, and drive the CI smoke-test domain from a GitHub Actions variable so
forks don't have to edit `.github/`.

---

## 3. Licensing & legal files (blocker for "open source")

- [ ] **Add a `LICENSE` file.** There is none today, which means *nobody can
      legally reuse it* — default copyright reserves all rights. Pick one (MIT is
      the simplest permissive choice; AGPL if you want hosted forks to stay open).
- [ ] **Add `ATTRIBUTION.md` / `NOTICE`** spelling out the IMDb non-commercial
      and OMDb terms (see 0.2). README prose isn't enough — it must survive a fork.
- [ ] Make sure your chosen software license **doesn't imply** the *data* is
      freely reusable — call out that the data sources have their own terms.

---

## 4. Onboarding / DX — so a stranger can actually run it

The current setup is ~6 manual steps (`README.md`) assuming a pre-existing
Postgres role and DB. Lower the barrier:

- [ ] **`docker-compose.yml` for local Postgres** (and optionally the app) so
      `docker compose up` gives a working DB instead of "create a `movie_manager`
      database owned by `adityaviki` first."
- [ ] **One-command bootstrap** (Makefile or `scripts/setup.sh`): install →
      copy `.env.example` → migrate → seed.
- [ ] **Pin the toolchain**: add `engines.node` to `package.json` and a
      `.nvmrc`/`.node-version` (README says "Node 20+" but nothing enforces it).
- [ ] **Document the data-load step honestly** — the IMDb sync needs the dataset
      download (~2 GB for backfill) and an OMDb key; say so up front.
- [ ] Add **`CONTRIBUTING.md`** (dev workflow, how to run, code style) and a
      **`SECURITY.md`** (how to report vulnerabilities).

---

## 5. Auth & multi-user (only heavy if you chose model B)

Current model (verified): a **shared global catalog** (`Movie`, `Person`,
`MovieCredit`) with **per-user flags** (`UserMovie.inWatchlist/watched`). User
data isolation is correct — all user queries are scoped by `userId`
(`packages/backend/src/routes/movies.ts`), and there's no public sign-up; users
are created by the CLI seed (`src/scripts/seed-user.ts`).

**Model A (self-host):** this is already fine. Each operator seeds their user.
Optionally add a friendlier first-run setup than the env-var seed script.

**Model B (public service):** you'd need to build, at minimum —
- [ ] A public `POST /auth/register` endpoint (doesn't exist today).
- [ ] Email verification + bot/abuse protection (CAPTCHA, signup rate limits).
- [ ] Token lifecycle: today it's a single 30-day JWT cookie with no server-side
      revocation — logout only clears the cookie (`src/routes/auth.ts`). Consider
      short-lived access + refresh tokens or a revocation list.
- [ ] Decide the catalog model: keep one shared catalog (fine for a movie app),
      or add a `tenantId` if users must have isolated libraries.

Cookie/JWT hygiene is already reasonable (`src/lib/auth.ts`): `httpOnly`,
`sameSite: 'lax'`, `secure` in production, signed. Keep that.

---

## 6. Hardening (worth doing for either model)

- [ ] **Fail fast on missing env.** `src/db/index.ts` and `src/index.ts` use
      `process.env.X!` (non-null assertions) for `DATABASE_URL`, `JWT_SECRET`,
      `COOKIE_SECRET` — a missing var crashes later with a confusing error.
      Validate them at startup and exit with a clear message (a small zod schema
      or manual checks).
- [ ] **Input validation.** Routes parse query params by hand with no bounds —
      notably `pageSize` is unbounded (`src/routes/movies.ts`), so a client can
      request a huge page. Add Fastify route schemas or zod; cap `pageSize`,
      validate `sortBy`/`sortOrder`/`peopleRole` against allowed values.
- [ ] **Rate limiting beyond login.** `@fastify/rate-limit` is registered with
      `global: false` and only `/auth/login` opts in (`src/routes/auth.ts`).
      Add sensible per-route limits to `/movies*` and `/people/*` if exposed
      publicly. (SQL is parameterized via Drizzle — no injection risk found.)
- [ ] **Global error handler + structured logging** so unexpected throws return a
      clean 500 and are logged consistently.

---

## 7. Code quality & maintainability

- [ ] **Tests.** There are none. Even a thin layer helps contributors trust
      changes — start with the auth flow and the IMDb filter/transform logic
      (pure functions in the sync script are easy wins). Add a `test` script and
      a runner (Vitest fits this stack).
- [ ] **CI does too little.** `.github/workflows/deploy.yml` only typechecks +
      builds, on `main` only. Add a separate PR workflow that runs lint +
      typecheck + tests on pull requests.
- [ ] **Lint isn't enforced.** `eslint.config.mjs` exists but no `lint` script
      and CI never runs it. Add `lint`/`format` scripts and wire ESLint (and a
      formatter) into CI. (TypeScript `strict` is already on in both packages —
      good.)

---

## 8. Project metadata & community polish

- [ ] Fill in `package.json` fields for the published packages: `description`,
      `license`, `author`, `repository`, `keywords`, `engines`. Root stays
      `private: true` (correct for a monorepo).
- [ ] Decide on package naming — `@movie/*` is fine for an internal workspace,
      but the `@movie` npm scope isn't yours; rename if you ever publish packages.
- [ ] Add GitHub issue/PR templates and a short "Roadmap"/"Status" note in the
      README so people know what's maintained.

---

## Suggested order of operations

1. **Plug the leak** (§1) — rotate the OMDb key, add `.env.example`. *Do this
   before any public push.*
2. **Decide A vs B** (§0) and write the licensing/attribution files (§3).
3. **De-personalize** deploy + docs (§2).
4. **Make it runnable by strangers** (§4: compose, bootstrap, contributing).
5. **Harden** (§6) and add a **PR CI + a few tests** (§7).
6. Only if pursuing **model B**: build registration/abuse-protection (§5).

Steps 1–4 get you to a credible open-source self-host release. 5–6 raise quality.
The public-service path (B) is a bigger commitment and gated by IMDb's license.
