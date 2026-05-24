import type { FastifyInstance } from 'fastify'
import { asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { movieCredits, people } from '../db/schema.js'

const MAX_RESULTS = 20

export async function peopleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth)

  app.get<{ Querystring: { q?: string; ids?: string } }>('/people/search', async (req) => {
    const q = (req.query.q ?? '').trim()
    if (q.length < 2) return []

    // Rank by: exact ilike match → starts-with → contains. Tiebreak by credit count.
    const rankExpr = sql<number>`CASE
      WHEN lower(${people.name}) = lower(${q}) THEN 0
      WHEN lower(${people.name}) LIKE lower(${q + '%'}) THEN 1
      ELSE 2
    END`
    const rows = await db
      .select({
        id: people.id,
        name: people.name,
        professions: people.professions,
        credits: sql<number>`COUNT(${movieCredits.movieId})::int`,
      })
      .from(people)
      .leftJoin(movieCredits, eq(movieCredits.personId, people.id))
      .where(ilike(people.name, `%${q}%`))
      .groupBy(people.id, people.name, people.professions)
      .orderBy(asc(rankExpr), desc(sql`COUNT(${movieCredits.movieId})`))
      .limit(MAX_RESULTS)

    return rows
  })

  app.get<{ Querystring: { ids?: string } }>('/people/lookup', async (req) => {
    const ids = (req.query.ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length === 0) return []
    const rows = await db
      .select({ id: people.id, name: people.name, professions: people.professions })
      .from(people)
      .where(inArray(people.id, ids))
    return rows
  })
}
