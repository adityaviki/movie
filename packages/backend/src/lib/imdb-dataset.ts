import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { mkdir, unlink, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'

const IMDB_BASE = 'https://datasets.imdbws.com'

export type DatasetFile =
  | 'title.basics.tsv.gz'
  | 'title.ratings.tsv.gz'
  | 'title.principals.tsv.gz'
  | 'name.basics.tsv.gz'

const NULL_TOKEN = '\\N'

export function parseNullable(value: string | undefined): string | null {
  if (value === undefined || value === '' || value === NULL_TOKEN) return null
  return value
}

export function parseNullableInt(value: string | undefined): number | null {
  const v = parseNullable(value)
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export function parseNullableFloat(value: string | undefined): number | null {
  const v = parseNullable(value)
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseList(value: string | undefined): string[] {
  const v = parseNullable(value)
  if (v === null) return []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

export function parseCharacters(value: string | undefined): string[] {
  const v = parseNullable(value)
  if (v === null) return []
  try {
    const parsed = JSON.parse(v)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // some rows contain a single quoted string without brackets — fall through
  }
  return [v]
}

export interface DownloadOptions {
  /** Base directory for downloads; defaults to $IMDB_CACHE_DIR or /tmp/imdb-datasets */
  cacheDir?: string
  /** If true, redownload even if the file already exists on disk. */
  force?: boolean
}

export function getCacheDir(opts: DownloadOptions = {}): string {
  return opts.cacheDir ?? process.env.IMDB_CACHE_DIR ?? join(tmpdir(), 'imdb-datasets')
}

/**
 * Download a dataset file to the cache directory. Skips the download when the
 * file already exists and `force` is false. Returns the local path.
 */
export async function downloadDataset(file: DatasetFile, opts: DownloadOptions = {}): Promise<string> {
  const dir = getCacheDir(opts)
  await mkdir(dir, { recursive: true })
  const dest = join(dir, file)

  if (!opts.force && existsSync(dest)) {
    const stats = await stat(dest)
    if (stats.size > 0) return dest
  }

  const url = `${IMDB_BASE}/${file}`
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Failed to download ${url}: ${res.status}`)

  const tmpDest = `${dest}.partial`
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmpDest))
  await pipeline(createReadStream(tmpDest), createWriteStream(dest))
  await unlink(tmpDest).catch(() => {})
  return dest
}

/**
 * Stream a gzipped TSV from disk line-by-line. Yields rows as string[] split on
 * tabs, skipping the header. Memory stays bounded regardless of file size.
 */
export async function* streamTsv(path: string): AsyncGenerator<string[], void, void> {
  const stream = createReadStream(path).pipe(createGunzip())
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  let header = true
  for await (const line of rl) {
    if (header) {
      header = false
      continue
    }
    if (!line) continue
    yield line.split('\t')
  }
}

export async function removeCached(file: DatasetFile, opts: DownloadOptions = {}): Promise<void> {
  const dest = join(getCacheDir(opts), file)
  await unlink(dest).catch(() => {})
}

// --- Row types matching IMDB dataset schemas ---
// https://developer.imdb.com/non-commercial-datasets/

export interface TitleBasicsRow {
  tconst: string
  titleType: string
  primaryTitle: string
  originalTitle: string | null
  isAdult: boolean
  startYear: number | null
  endYear: number | null
  runtimeMinutes: number | null
  genres: string[]
}

export function parseTitleBasics(cols: string[]): TitleBasicsRow | null {
  if (cols.length < 9 || !cols[0]) return null
  return {
    tconst: cols[0],
    titleType: cols[1] ?? '',
    primaryTitle: cols[2] ?? '',
    originalTitle: parseNullable(cols[3]),
    isAdult: cols[4] === '1',
    startYear: parseNullableInt(cols[5]),
    endYear: parseNullableInt(cols[6]),
    runtimeMinutes: parseNullableInt(cols[7]),
    genres: parseList(cols[8]),
  }
}

export interface TitleRatingsRow {
  tconst: string
  averageRating: number
  numVotes: number
}

export function parseTitleRatings(cols: string[]): TitleRatingsRow | null {
  if (cols.length < 3 || !cols[0]) return null
  const rating = parseNullableFloat(cols[1])
  const votes = parseNullableInt(cols[2])
  if (rating === null || votes === null) return null
  return { tconst: cols[0], averageRating: rating, numVotes: votes }
}

export interface TitlePrincipalsRow {
  tconst: string
  ordering: number
  nconst: string
  category: string
  job: string | null
  characters: string[]
}

export function parseTitlePrincipals(cols: string[]): TitlePrincipalsRow | null {
  if (cols.length < 6 || !cols[0] || !cols[2]) return null
  const ordering = parseNullableInt(cols[1])
  if (ordering === null) return null
  return {
    tconst: cols[0],
    ordering,
    nconst: cols[2],
    category: cols[3] ?? '',
    job: parseNullable(cols[4]),
    characters: parseCharacters(cols[5]),
  }
}

export interface NameBasicsRow {
  nconst: string
  primaryName: string
  birthYear: number | null
  deathYear: number | null
  primaryProfession: string[]
}

export function parseNameBasics(cols: string[]): NameBasicsRow | null {
  if (cols.length < 5 || !cols[0]) return null
  return {
    nconst: cols[0],
    primaryName: cols[1] ?? '',
    birthYear: parseNullableInt(cols[2]),
    deathYear: parseNullableInt(cols[3]),
    primaryProfession: parseList(cols[4]),
  }
}

/**
 * Map IMDB titleType to our internal type string. Values mirror the historical
 * format already stored in the Movie table.
 */
export function mapTitleType(titleType: string): string | null {
  switch (titleType) {
    case 'movie':
      return 'feature'
    case 'tvSeries':
      return 'tv_series'
    case 'tvMiniSeries':
      return 'tvMiniSeries'
    case 'tvMovie':
      return 'tvMovie'
    case 'tvSpecial':
      return 'tvSpecial'
    case 'video':
      return 'video'
    default:
      return null
  }
}
