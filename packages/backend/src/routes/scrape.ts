import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { movies } from '../db/schema.js'
import { scrapeYear, sleep } from '../lib/scraper.js'
import { createId } from '@paralleldrive/cuid2'
import { desc, isNotNull } from 'drizzle-orm'

export async function scrapeRoutes(app: FastifyInstance) {
  app.post('/scrape', async (req, reply) => {
    const currentYear = new Date().getFullYear()

    const [mostRecent] = await db
      .select({ year: movies.year })
      .from(movies)
      .where(isNotNull(movies.year))
      .orderBy(desc(movies.year))
      .limit(1)

    const startYear = mostRecent?.year ?? currentYear - 1

    reply.raw.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    })

    let totalNew = 0

    for (let year = currentYear; year >= startYear; year--) {
      let scraped
      try {
        scraped = await scrapeYear(year)
      } catch {
        continue
      }

      const imdbIds = scraped.map((m) => m.imdbId)
      const existing = await db.select({ imdbId: movies.imdbId }).from(movies)
      const existingIds = new Set(existing.map((e) => e.imdbId))
      const newMovies = scraped.filter((m) => !existingIds.has(m.imdbId))

      let yearNew = 0
      for (const movie of newMovies) {
        try {
          await db.insert(movies).values({
            id: createId(),
            ...movie,
            genres: movie.genres ?? [],
            updatedAt: new Date(),
          })
          yearNew++
        } catch { /* skip duplicates */ }
      }

      totalNew += yearNew
      reply.raw.write(JSON.stringify({ type: 'progress', year, yearNew, yearParsed: scraped.length, totalNew }) + '\n')

      if (year > startYear) await sleep(1500)
    }

    reply.raw.write(JSON.stringify({ type: 'done', totalNew }) + '\n')
    reply.raw.end()
  })
}
