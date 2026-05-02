import * as cheerio from 'cheerio'

const IMDB_BASE = 'https://www.imdb.com/search/title/?num_votes=10000,&user_rating=7.0,&sort=release_date,desc&count=250'
const DEFAULT_TITLE_TYPES = 'feature,tv_movie,tv_special,tv_series,tv_miniseries,video'

function imdbBaseUrl(titleType?: string) {
  return `${IMDB_BASE}&title_type=${titleType ?? DEFAULT_TITLE_TYPES}`
}

export interface ScrapedMovie {
  imdbId: string
  title: string
  year: number | null
  type: string | null
  rating: number | null
  votes: number | null
  genres: string[]
  runtime: string | null
  certificate: string | null
  description: string | null
  posterUrl: string | null
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function transformPosterUrl(url: string | null) {
  if (!url) return null
  return url.replace(/\._V1_.*\.jpg$/, '._V1_FMjpg_UX600_.jpg')
}

function formatRuntime(seconds: number | null) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

async function fetchPage(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}

function parseMovies(html: string): ScrapedMovie[] {
  const $ = cheerio.load(html)
  const data = JSON.parse($('script#__NEXT_DATA__').text() || '{}')
  const items = data?.props?.pageProps?.searchResults?.titleResults?.titleListItems
  if (!Array.isArray(items)) return []

  const keep = new Set(['feature', 'tv_series', 'tvMiniSeries', 'tvMovie', 'tvSpecial', 'video'])

  return items
    .map((item: any): ScrapedMovie | null => {
      if (!item.titleId || !item.titleText) return null
      const typeId = item.titleType?.id
      let type: string | null = null
      if (typeId === 'movie') type = 'feature'
      else if (typeId === 'tvSeries') type = 'tv_series'
      else if (typeId) type = typeId
      return {
        imdbId: item.titleId,
        title: item.titleText,
        year: item.releaseYear ?? null,
        type,
        rating: item.ratingSummary?.aggregateRating ?? null,
        votes: item.ratingSummary?.voteCount ?? null,
        genres: item.genres ?? [],
        runtime: formatRuntime(item.runtime ?? null),
        certificate: item.certificate ?? null,
        description: item.plot ?? null,
        posterUrl: transformPosterUrl(item.primaryImage?.url ?? null),
      }
    })
    .filter((m): m is ScrapedMovie => m !== null && m.type !== null && keep.has(m.type))
}

function buildDateRangeUrl(start: string, end: string, titleType?: string) {
  return `${imdbBaseUrl(titleType)}&release_date=${start},${end}`
}

function buildYearUrl(year: number, titleType?: string) {
  return buildDateRangeUrl(`${year}-01-01`, `${year}-12-31`, titleType)
}

export async function scrapeYear(year: number): Promise<ScrapedMovie[]> {
  const movies = parseMovies(await fetchPage(buildYearUrl(year)))
  if (movies.length < 250) return movies

  await sleep(1500)
  const h1 = parseMovies(await fetchPage(buildDateRangeUrl(`${year}-01-01`, `${year}-06-30`)))
  await sleep(1500)
  const h2 = parseMovies(await fetchPage(buildDateRangeUrl(`${year}-07-01`, `${year}-12-31`)))

  const seen = new Set<string>()
  return [...h1, ...h2].filter((m) => seen.has(m.imdbId) ? false : (seen.add(m.imdbId), true))
}
