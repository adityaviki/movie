import type { FastifyInstance } from 'fastify'
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { movies } from '../db/schema.js'
import type { MovieFilters, MovieFormData } from '@movie/shared'

export async function movieRoutes(app: FastifyInstance) {
  app.get('/movies/genres', async () => {
    const rows = await db.select({ genres: movies.genres }).from(movies)
    const set = new Set<string>()
    rows.forEach((r) => r.genres?.forEach((g) => set.add(g)))
    return Array.from(set).sort()
  })

  app.get<{ Querystring: Record<string, string> }>('/movies', async (req) => {
    const q = req.query
    const filters: MovieFilters = {
      search: q.search || undefined,
      genre: q.genre || undefined,
      minRating: q.minRating ? Number(q.minRating) : undefined,
      maxRating: q.maxRating ? Number(q.maxRating) : undefined,
      year: q.year ? Number(q.year) : undefined,
      type: q.type || undefined,
      inWatchlist: q.inWatchlist === 'true' ? true : q.inWatchlist === 'false' ? false : undefined,
      watched: q.watched === 'true' ? true : q.watched === 'false' ? false : undefined,
      sortBy: (q.sortBy as MovieFilters['sortBy']) || 'createdAt',
      sortOrder: (q.sortOrder as MovieFilters['sortOrder']) || 'desc',
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 20,
    }

    const conditions = []
    if (filters.search) conditions.push(or(ilike(movies.title, `%${filters.search}%`), ilike(movies.description, `%${filters.search}%`)))
    if (filters.genre) conditions.push(sql`${movies.genres} @> ARRAY[${filters.genre}]::text[]`)
    if (filters.minRating !== undefined) conditions.push(gte(movies.rating, filters.minRating))
    if (filters.maxRating !== undefined) conditions.push(lte(movies.rating, filters.maxRating))
    if (filters.year !== undefined) conditions.push(eq(movies.year, filters.year))
    if (filters.type) conditions.push(eq(movies.type, filters.type))
    if (filters.inWatchlist !== undefined) conditions.push(eq(movies.inWatchlist, filters.inWatchlist))
    if (filters.watched !== undefined) conditions.push(eq(movies.watched, filters.watched))

    const where = conditions.length ? and(...conditions) : undefined
    const sortCol = { title: movies.title, rating: movies.rating, year: movies.year, createdAt: movies.createdAt }[filters.sortBy!]!
    const order = filters.sortOrder === 'asc' ? asc(sortCol) : desc(sortCol)
    const skip = ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20)

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(movies).where(where).orderBy(order).limit(filters.pageSize!).offset(skip),
      db.select({ total: sql<number>`count(*)::int` }).from(movies).where(where),
    ])

    return { movies: rows, total, page: filters.page, pageSize: filters.pageSize }
  })

  app.get<{ Params: { id: string } }>('/movies/:id', async (req, reply) => {
    const [movie] = await db.select().from(movies).where(eq(movies.id, req.params.id)).limit(1)
    if (!movie) return reply.code(404).send({ error: 'Not found' })
    return movie
  })

  app.post<{ Body: MovieFormData }>('/movies', async (req, reply) => {
    const [movie] = await db.insert(movies).values({
      id: createId(),
      ...req.body,
      genres: req.body.genres ?? [],
      updatedAt: new Date(),
    }).returning()
    return reply.code(201).send(movie)
  })

  app.put<{ Params: { id: string }; Body: MovieFormData }>('/movies/:id', async (req, reply) => {
    const [movie] = await db.update(movies)
      .set({ ...req.body, genres: req.body.genres ?? [], updatedAt: new Date() })
      .where(eq(movies.id, req.params.id))
      .returning()
    if (!movie) return reply.code(404).send({ error: 'Not found' })
    return movie
  })

  app.delete<{ Params: { id: string } }>('/movies/:id', async (req, reply) => {
    await db.delete(movies).where(eq(movies.id, req.params.id))
    return reply.code(204).send()
  })

  app.patch<{ Params: { id: string } }>('/movies/:id/watchlist', async (req, reply) => {
    const [current] = await db.select({ inWatchlist: movies.inWatchlist }).from(movies).where(eq(movies.id, req.params.id)).limit(1)
    if (!current) return reply.code(404).send({ error: 'Not found' })
    const [movie] = await db.update(movies)
      .set({ inWatchlist: !current.inWatchlist, updatedAt: new Date() })
      .where(eq(movies.id, req.params.id))
      .returning()
    return movie
  })

  app.patch<{ Params: { id: string } }>('/movies/:id/watched', async (req, reply) => {
    const [current] = await db.select({ watched: movies.watched }).from(movies).where(eq(movies.id, req.params.id)).limit(1)
    if (!current) return reply.code(404).send({ error: 'Not found' })
    const [movie] = await db.update(movies)
      .set({ watched: !current.watched, updatedAt: new Date() })
      .where(eq(movies.id, req.params.id))
      .returning()
    return movie
  })
}
