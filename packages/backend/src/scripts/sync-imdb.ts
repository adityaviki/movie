import 'dotenv/config'
import { createId } from '@paralleldrive/cuid2'
import { inArray, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { movies, people, movieCredits } from '../db/schema.js'
import {
  downloadDataset,
  streamTsv,
  parseTitleBasics,
  parseTitleRatings,
  parseTitlePrincipals,
  parseNameBasics,
  mapTitleType,
  type DatasetFile,
} from '../lib/imdb-dataset.js'
import { fetchOmdbTitle, OmdbQuotaError, sleep } from '../lib/omdb.js'

const MIN_RATING = 7.0
const MIN_VOTES = 30_000
const ALLOWED_TITLE_TYPES = new Set(['movie', 'tvSeries', 'tvMiniSeries', 'tvMovie', 'tvSpecial', 'video'])
const MIN_AGE_DAYS = 30
const OMDB_REQUEST_INTERVAL_MS = 1100
const CREDIT_BATCH_SIZE = 500
const PERSON_BATCH_SIZE = 500

interface SyncOptions {
  backfill: boolean
  omdbCap: number
  omdbApiKey: string | null
  forceDownload: boolean
}

function parseArgs(): SyncOptions {
  const args = new Set(process.argv.slice(2))
  return {
    backfill: args.has('--backfill'),
    forceDownload: args.has('--force-download'),
    omdbCap: Number(process.env.OMDB_MAX_CALLS_PER_RUN ?? 800),
    omdbApiKey: process.env.OMDB_API_KEY ?? null,
  }
}

async function ensureDownloads(force: boolean) {
  const files: DatasetFile[] = [
    'title.ratings.tsv.gz',
    'title.basics.tsv.gz',
    'title.principals.tsv.gz',
    'name.basics.tsv.gz',
  ]
  const paths: Record<DatasetFile, string> = {} as Record<DatasetFile, string>
  for (const file of files) {
    log(`Downloading ${file}…`)
    paths[file] = await downloadDataset(file, { force })
  }
  return paths
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`)
}

function todayMinusDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

async function loadExistingMovieMap(): Promise<Map<string, string>> {
  const rows = await db.select({ id: movies.id, imdbId: movies.imdbId }).from(movies)
  const map = new Map<string, string>()
  for (const r of rows) if (r.imdbId) map.set(r.imdbId, r.id)
  return map
}

/**
 * Pass 1 — title.ratings: keep tconsts that meet rating/votes thresholds.
 */
async function loadQualifyingRatings(path: string): Promise<Map<string, { rating: number; votes: number }>> {
  const out = new Map<string, { rating: number; votes: number }>()
  let scanned = 0
  for await (const cols of streamTsv(path)) {
    scanned++
    const row = parseTitleRatings(cols)
    if (!row) continue
    if (row.averageRating < MIN_RATING || row.numVotes < MIN_VOTES) continue
    out.set(row.tconst, { rating: row.averageRating, votes: row.numVotes })
  }
  log(`Ratings scanned: ${scanned.toLocaleString()}; qualifying: ${out.size.toLocaleString()}`)
  return out
}

interface CandidateBasic {
  tconst: string
  titleType: string
  primaryTitle: string
  startYear: number | null
  runtimeMinutes: number | null
  genres: string[]
  rating: number
  votes: number
}

/**
 * Pass 2 — title.basics: narrow ratings-qualifying tconsts to allowed title
 * types and not-in-future startYear. Returns the joined basics+ratings rows.
 */
async function loadCandidateBasics(
  path: string,
  ratings: Map<string, { rating: number; votes: number }>,
): Promise<Map<string, CandidateBasic>> {
  const out = new Map<string, CandidateBasic>()
  const currentYear = new Date().getUTCFullYear()
  let scanned = 0
  for await (const cols of streamTsv(path)) {
    scanned++
    const row = parseTitleBasics(cols)
    if (!row) continue
    const r = ratings.get(row.tconst)
    if (!r) continue
    if (!ALLOWED_TITLE_TYPES.has(row.titleType)) continue
    if (row.startYear !== null && row.startYear > currentYear) continue
    out.set(row.tconst, {
      tconst: row.tconst,
      titleType: row.titleType,
      primaryTitle: row.primaryTitle,
      startYear: row.startYear,
      runtimeMinutes: row.runtimeMinutes,
      genres: row.genres,
      rating: r.rating,
      votes: r.votes,
    })
  }
  log(`Basics scanned: ${scanned.toLocaleString()}; candidates after type filter: ${out.size.toLocaleString()}`)
  return out
}

function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

interface NewMovieInput extends CandidateBasic {
  posterUrl: string | null
  certificate: string | null
  description: string | null
}

/**
 * Daily-mode candidate filter: drop tconsts already in DB. Returns the new
 * tconsts in priority order (oldest startYear first so most-stable picks land
 * first when the OMDB cap kicks in).
 */
function newCandidatesInPriorityOrder(
  candidates: Map<string, CandidateBasic>,
  existing: Map<string, string>,
): CandidateBasic[] {
  const fresh: CandidateBasic[] = []
  for (const c of candidates.values()) {
    if (existing.has(c.tconst)) continue
    fresh.push(c)
  }
  fresh.sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0))
  return fresh
}

/**
 * For each new candidate, call OMDB to verify the 3-month rule and enrich
 * poster/certificate/plot. Returns accepted rows ready to insert. Stops early
 * when the OMDB call budget or quota is exhausted.
 */
async function enrichAndFilterByAge(
  candidates: CandidateBasic[],
  apiKey: string,
  maxCalls: number,
): Promise<NewMovieInput[]> {
  const currentYear = new Date().getUTCFullYear()
  const cutoff = todayMinusDays(MIN_AGE_DAYS)
  const accepted: NewMovieInput[] = []
  let calls = 0
  let rejectedTooNew = 0
  let omdbMisses = 0

  for (const c of candidates) {
    if (calls >= maxCalls) {
      log(`OMDB call cap (${maxCalls}) reached; deferring ${candidates.length - candidates.indexOf(c)} candidates`)
      break
    }

    // Fast-path: startYear comfortably in the past — still call OMDB for enrichment
    // but we'll accept regardless of Released. For startYear==currentYear, the
    // Released date is the gating factor.
    const needsAgeCheck = c.startYear !== null && c.startYear >= currentYear

    let omdb: Awaited<ReturnType<typeof fetchOmdbTitle>>
    try {
      omdb = await fetchOmdbTitle(c.tconst, apiKey)
      calls++
    } catch (err) {
      if (err instanceof OmdbQuotaError) {
        log('OMDB quota exhausted; stopping enrichment')
        break
      }
      log(`OMDB error for ${c.tconst}: ${(err as Error).message}; skipping`)
      continue
    }

    if (!omdb) {
      omdbMisses++
      continue
    }

    const releaseDate = omdb.releaseDate ?? (c.startYear ? `${c.startYear}-01-01` : null)
    if (needsAgeCheck) {
      if (!releaseDate || releaseDate > cutoff) {
        rejectedTooNew++
        await sleep(OMDB_REQUEST_INTERVAL_MS)
        continue
      }
    }

    accepted.push({
      ...c,
      posterUrl: omdb.posterUrl,
      certificate: omdb.certificate,
      description: omdb.description,
    })
    await sleep(OMDB_REQUEST_INTERVAL_MS)
  }

  log(
    `OMDB: calls=${calls}, accepted=${accepted.length}, rejectedTooNew=${rejectedTooNew}, omdbMisses=${omdbMisses}`,
  )
  return accepted
}

async function insertNewMovies(rows: NewMovieInput[]): Promise<Map<string, string>> {
  if (rows.length === 0) return new Map()
  const inserted = new Map<string, string>()
  // Insert in chunks to stay clear of param limits.
  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const values = chunk.map((r) => ({
      id: createId(),
      imdbId: r.tconst,
      title: r.primaryTitle,
      year: r.startYear,
      type: mapTitleType(r.titleType),
      rating: r.rating,
      votes: r.votes,
      genres: r.genres,
      runtime: formatRuntime(r.runtimeMinutes),
      certificate: r.certificate,
      description: r.description,
      posterUrl: r.posterUrl,
      updatedAt: new Date(),
    }))
    const returned = await db.insert(movies).values(values).returning({ id: movies.id, imdbId: movies.imdbId })
    for (const row of returned) {
      if (row.imdbId) inserted.set(row.imdbId, row.id)
    }
  }
  log(`Inserted ${inserted.size} new movies`)
  return inserted
}

interface CreditBuffer {
  rowsByMovie: Map<string, Array<{ nconst: string; category: string; ordering: number; job: string | null; characters: string[] }>>
  nconsts: Set<string>
}

/**
 * Pass 3 — title.principals: stream and keep only rows whose tconst is in the
 * provided set. Groups credits by movie so we can DELETE+INSERT atomically per
 * movie later.
 */
async function loadPrincipalsForMovies(
  path: string,
  tconstToMovieId: Map<string, string>,
): Promise<CreditBuffer> {
  const rowsByMovie = new Map<string, Array<{ nconst: string; category: string; ordering: number; job: string | null; characters: string[] }>>()
  const nconsts = new Set<string>()
  let scanned = 0
  let kept = 0
  for await (const cols of streamTsv(path)) {
    scanned++
    const row = parseTitlePrincipals(cols)
    if (!row) continue
    const movieId = tconstToMovieId.get(row.tconst)
    if (!movieId) continue
    let arr = rowsByMovie.get(movieId)
    if (!arr) {
      arr = []
      rowsByMovie.set(movieId, arr)
    }
    arr.push({
      nconst: row.nconst,
      category: row.category,
      ordering: row.ordering,
      job: row.job,
      characters: row.characters,
    })
    nconsts.add(row.nconst)
    kept++
  }
  log(`Principals scanned: ${scanned.toLocaleString()}; kept: ${kept.toLocaleString()} across ${rowsByMovie.size} movies`)
  return { rowsByMovie, nconsts }
}

/**
 * Pass 4 — name.basics: stream and upsert Person rows for the given nconsts.
 */
async function upsertPeople(path: string, nconsts: Set<string>): Promise<number> {
  if (nconsts.size === 0) return 0
  let scanned = 0
  let upserted = 0
  let batch: Array<{ id: string; name: string; birthYear: number | null; deathYear: number | null; professions: string[] }> = []

  const flush = async () => {
    if (batch.length === 0) return
    await db
      .insert(people)
      .values(batch.map((p) => ({ ...p, updatedAt: new Date() })))
      .onConflictDoUpdate({
        target: people.id,
        set: {
          name: sql`excluded.name`,
          birthYear: sql`excluded."birthYear"`,
          deathYear: sql`excluded."deathYear"`,
          professions: sql`excluded.professions`,
          updatedAt: sql`now()`,
        },
      })
    upserted += batch.length
    batch = []
  }

  for await (const cols of streamTsv(path)) {
    scanned++
    const row = parseNameBasics(cols)
    if (!row) continue
    if (!nconsts.has(row.nconst)) continue
    batch.push({
      id: row.nconst,
      name: row.primaryName,
      birthYear: row.birthYear,
      deathYear: row.deathYear,
      professions: row.primaryProfession,
    })
    if (batch.length >= PERSON_BATCH_SIZE) await flush()
  }
  await flush()
  log(`Names scanned: ${scanned.toLocaleString()}; persons upserted: ${upserted.toLocaleString()}`)
  return upserted
}

async function replaceCreditsForMovies(buffer: CreditBuffer): Promise<number> {
  if (buffer.rowsByMovie.size === 0) return 0
  const movieIds = Array.from(buffer.rowsByMovie.keys())
  let inserted = 0

  // Delete old credits for the targeted movies in chunks.
  for (let i = 0; i < movieIds.length; i += 500) {
    const chunk = movieIds.slice(i, i + 500)
    await db.delete(movieCredits).where(inArray(movieCredits.movieId, chunk))
  }

  // Insert fresh credits in chunks.
  let batch: Array<{ movieId: string; personId: string; category: string; ordering: number; job: string | null; characters: string[] | null }> = []
  const flush = async () => {
    if (batch.length === 0) return
    await db.insert(movieCredits).values(batch).onConflictDoNothing()
    inserted += batch.length
    batch = []
  }
  for (const [movieId, rows] of buffer.rowsByMovie) {
    for (const r of rows) {
      batch.push({
        movieId,
        personId: r.nconst,
        category: r.category,
        ordering: r.ordering,
        job: r.job,
        characters: r.characters.length ? r.characters : null,
      })
      if (batch.length >= CREDIT_BATCH_SIZE) await flush()
    }
  }
  await flush()
  log(`Credits inserted: ${inserted.toLocaleString()} across ${buffer.rowsByMovie.size} movies`)
  return inserted
}

async function runBackfill(): Promise<void> {
  log('Mode: BACKFILL (cast/crew for existing movies)')
  const paths = await ensureDownloads(false)
  const existing = await loadExistingMovieMap()
  if (existing.size === 0) {
    log('No existing movies with imdbId; nothing to backfill')
    return
  }
  log(`Existing movies with imdbId: ${existing.size}`)

  const credits = await loadPrincipalsForMovies(paths['title.principals.tsv.gz'], existing)
  await upsertPeople(paths['name.basics.tsv.gz'], credits.nconsts)
  await replaceCreditsForMovies(credits)
  log('Backfill complete')
}

async function runDaily(opts: SyncOptions): Promise<void> {
  log('Mode: DAILY (discover new titles)')
  if (!opts.omdbApiKey) throw new Error('OMDB_API_KEY env var is required for daily sync')

  const paths = await ensureDownloads(opts.forceDownload)
  const existing = await loadExistingMovieMap()
  log(`Existing movies in DB: ${existing.size}`)

  const ratings = await loadQualifyingRatings(paths['title.ratings.tsv.gz'])
  const candidates = await loadCandidateBasics(paths['title.basics.tsv.gz'], ratings)
  const fresh = newCandidatesInPriorityOrder(candidates, existing)
  log(`New candidates not in DB: ${fresh.length}`)

  if (fresh.length === 0) {
    log('Nothing to add today')
    return
  }

  const accepted = await enrichAndFilterByAge(fresh, opts.omdbApiKey, opts.omdbCap)
  const inserted = await insertNewMovies(accepted)

  if (inserted.size === 0) {
    log('No new movies inserted; skipping principals pass')
    return
  }

  const credits = await loadPrincipalsForMovies(paths['title.principals.tsv.gz'], inserted)
  await upsertPeople(paths['name.basics.tsv.gz'], credits.nconsts)
  await replaceCreditsForMovies(credits)
  log('Daily sync complete')
}

async function main() {
  const opts = parseArgs()
  if (opts.backfill) {
    await runBackfill()
  } else {
    await runDaily(opts)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
