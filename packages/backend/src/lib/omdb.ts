const OMDB_BASE = 'http://www.omdbapi.com'

export interface OmdbResponse {
  imdbId: string
  posterUrl: string | null
  certificate: string | null
  description: string | null
  /** Parsed YYYY-MM-DD from OMDB's "Released" field, or null when N/A. */
  releaseDate: string | null
}

class OmdbQuotaError extends Error {
  constructor() {
    super('OMDB daily quota exhausted')
    this.name = 'OmdbQuotaError'
  }
}

export { OmdbQuotaError }

/**
 * Fetch a single title from OMDB. Returns null when OMDB reports the title is
 * missing. Throws OmdbQuotaError when the daily quota is exhausted so the
 * caller can stop early.
 */
export async function fetchOmdbTitle(imdbId: string, apiKey: string): Promise<OmdbResponse | null> {
  const url = `${OMDB_BASE}/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(apiKey)}&plot=full`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OMDB request failed: ${res.status}`)
  const data = (await res.json()) as Record<string, unknown>

  if (data.Response === 'False') {
    const err = String(data.Error ?? '')
    if (err.toLowerCase().includes('request limit')) throw new OmdbQuotaError()
    return null
  }

  return {
    imdbId,
    posterUrl: normalize(data.Poster),
    certificate: normalize(data.Rated),
    description: normalize(data.Plot),
    releaseDate: parseReleased(normalize(data.Released)),
  }
}

function normalize(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'N/A') return null
  return trimmed
}

/**
 * OMDB returns dates like "12 Jul 2024". Convert to YYYY-MM-DD.
 */
function parseReleased(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}
