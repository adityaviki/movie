import * as cheerio from "cheerio";

const IMDB_BASE =
  "https://www.imdb.com/search/title/?num_votes=10000,&user_rating=7.0,&sort=release_date,desc&count=250";

const DEFAULT_TITLE_TYPES = "feature,tv_movie,tv_special,tv_series,tv_miniseries,video";

function imdbBaseUrl(titleType?: string): string {
  return `${IMDB_BASE}&title_type=${titleType ?? DEFAULT_TITLE_TYPES}`;
}

export interface ScrapedMovie {
  imdbId: string;
  title: string;
  year: number | null;
  type: string | null;
  rating: number | null;
  votes: number | null;
  genres: string[];
  runtime: string | null;
  certificate: string | null;
  description: string | null;
  posterUrl: string | null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function transformPosterUrl(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/\._V1_.*\.jpg$/, "._V1_FMjpg_UX600_.jpg");
}

export function formatRuntime(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${res.status} ${res.statusText}`
    );
  }
  return res.text();
}

export function parseMovies(html: string): ScrapedMovie[] {
  const $ = cheerio.load(html);
  const scriptEl = $("script#__NEXT_DATA__");
  if (!scriptEl.length) return [];

  const data = JSON.parse(scriptEl.text());
  const items =
    data?.props?.pageProps?.searchResults?.titleResults?.titleListItems;
  if (!Array.isArray(items)) return [];

  return items
    .map((item: any): ScrapedMovie | null => {
      const imdbId = item.titleId;
      const title = item.titleText;
      if (!imdbId || !title) return null;

      const titleTypeId = item.titleType?.id;
      let type: string | null = null;
      if (titleTypeId === "movie") type = "feature";
      else if (titleTypeId === "tvSeries") type = "tv_series";
      else if (titleTypeId) type = titleTypeId;

      return {
        imdbId,
        title,
        year: item.releaseYear ?? null,
        type,
        rating: item.ratingSummary?.aggregateRating ?? null,
        votes: item.ratingSummary?.voteCount ?? null,
        genres: item.genres ?? [],
        runtime: formatRuntime(item.runtime ?? null),
        certificate: item.certificate ?? null,
        description: item.plot ?? null,
        posterUrl: transformPosterUrl(item.primaryImage?.url ?? null),
      };
    })
    .filter((m: ScrapedMovie | null): m is ScrapedMovie => m !== null)
    .filter((m) => {
      const keep = new Set(["feature", "tv_series", "tvMiniSeries", "tvMovie", "tvSpecial", "video"]);
      return m.type !== null && keep.has(m.type);
    });
}

const PAGE_SIZE = 250;

export function buildDateRangeUrl(startDate: string, endDate: string, titleType?: string): string {
  return `${imdbBaseUrl(titleType)}&release_date=${startDate},${endDate}`;
}

export function buildYearUrl(year: number, titleType?: string): string {
  return buildDateRangeUrl(`${year}-01-01`, `${year}-12-31`, titleType);
}

/**
 * Fetch all titles for a given year.
 * IMDB caps results at 250 per request and doesn't support URL-based pagination.
 * When we hit the cap, we split into H1 (Jan–Jun) and H2 (Jul–Dec) and fetch each.
 */
export async function scrapeYear(year: number, titleType?: string): Promise<ScrapedMovie[]> {
  const html = await fetchPage(buildYearUrl(year, titleType));
  const movies = parseMovies(html);

  if (movies.length < PAGE_SIZE) return movies;

  // Hit the 250 cap — split into two halves
  await sleep(1500);
  const h1Html = await fetchPage(buildDateRangeUrl(`${year}-01-01`, `${year}-06-30`, titleType));
  const h1 = parseMovies(h1Html);

  await sleep(1500);
  const h2Html = await fetchPage(buildDateRangeUrl(`${year}-07-01`, `${year}-12-31`, titleType));
  const h2 = parseMovies(h2Html);

  // Deduplicate by imdbId
  const seen = new Set<string>();
  const all: ScrapedMovie[] = [];
  for (const m of [...h1, ...h2]) {
    if (!seen.has(m.imdbId)) {
      seen.add(m.imdbId);
      all.push(m);
    }
  }
  return all;
}
