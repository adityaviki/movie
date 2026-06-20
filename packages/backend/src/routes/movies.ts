import type { FastifyInstance } from 'fastify'
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { movies, userMovies, movieCredits, people } from '../db/schema.js'
import type { MovieCreditPerson, MovieFilters, PeopleRole } from '@movie/shared'

const CAST_CATEGORIES = ['actor', 'actress', 'self']
const PEOPLE_ROLE_VALUES: PeopleRole[] = ['any', 'director', 'writer', 'producer', 'cast']

function rolePredicateSql(role: PeopleRole) {
  if (role === 'cast') {
    const list = sql.join(CAST_CATEGORIES.map((c) => sql`${c}`), sql`, `)
    return sql`${movieCredits.category} IN (${list})`
  }
  if (role === 'director' || role === 'writer' || role === 'producer') {
    return sql`${movieCredits.category} = ${role}`
  }
  return sql`TRUE`
}

const WATCHLIST_FALSE = sql<boolean>`COALESCE(${userMovies.inWatchlist}, false)`
const WATCHED_FALSE = sql<boolean>`COALESCE(${userMovies.watched}, false)`

function withUserFlags(_userId: string) {
  return {
    id: movies.id,
    imdbId: movies.imdbId,
    title: movies.title,
    year: movies.year,
    type: movies.type,
    rating: movies.rating,
    votes: movies.votes,
    genres: movies.genres,
    runtime: movies.runtime,
    certificate: movies.certificate,
    description: movies.description,
    posterUrl: movies.posterUrl,
    inWatchlist: WATCHLIST_FALSE.as('inWatchlist'),
    watched: WATCHED_FALSE.as('watched'),
    createdAt: movies.createdAt,
    updatedAt: movies.updatedAt,
  }
}

export async function movieRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth)

  app.get('/movies/genres', async () => {
    const rows = await db.select({ genres: movies.genres }).from(movies)
    const set = new Set<string>()
    rows.forEach((r) => r.genres?.forEach((g) => set.add(g)))
    return Array.from(set).sort()
  })

  app.get('/movies/types', async () => {
    const rows = await db
      .select({ type: movies.type, count: sql<number>`count(*)::int` })
      .from(movies)
      .where(sql`${movies.type} IS NOT NULL`)
      .groupBy(movies.type)
      .orderBy(desc(sql`count(*)`))
    return rows.map((r) => ({ type: r.type as string, count: r.count }))
  })

  app.get<{ Querystring: Record<string, string> }>('/movies', async (req) => {
    const userId = req.user.sub
    const q = req.query
    const genresList = q.genres ? q.genres.split(',').map((g) => g.trim()).filter(Boolean) : []
    const peopleList = q.people ? q.people.split(',').map((p) => p.trim()).filter(Boolean) : []
    const peopleRole: PeopleRole = PEOPLE_ROLE_VALUES.includes(q.peopleRole as PeopleRole)
      ? (q.peopleRole as PeopleRole)
      : 'any'
    const filters: MovieFilters = {
      search: q.search || undefined,
      genres: genresList.length ? genresList : undefined,
      type: q.type || undefined,
      minRating: q.minRating ? Number(q.minRating) : undefined,
      maxRating: q.maxRating ? Number(q.maxRating) : undefined,
      minYear: q.minYear ? Number(q.minYear) : undefined,
      maxYear: q.maxYear ? Number(q.maxYear) : undefined,
      minVotes: q.minVotes ? Number(q.minVotes) : undefined,
      maxVotes: q.maxVotes ? Number(q.maxVotes) : undefined,
      inWatchlist: q.inWatchlist === 'true' ? true : q.inWatchlist === 'false' ? false : undefined,
      watched: q.watched === 'true' ? true : q.watched === 'false' ? false : undefined,
      people: peopleList.length ? peopleList : undefined,
      peopleRole: peopleList.length ? peopleRole : undefined,
      sortBy: (q.sortBy as MovieFilters['sortBy']) || 'year',
      sortOrder: (q.sortOrder as MovieFilters['sortOrder']) || 'desc',
      seed: q.seed || undefined,
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 20,
    }

    const conditions = []
    if (filters.search) conditions.push(or(ilike(movies.title, `%${filters.search}%`), ilike(movies.description, `%${filters.search}%`)))
    if (filters.genres && filters.genres.length) {
      const items = sql.join(filters.genres.map((g) => sql`${g}`), sql`, `)
      conditions.push(sql`${movies.genres} @> ARRAY[${items}]::text[]`)
    }
    if (filters.type) conditions.push(eq(movies.type, filters.type))
    if (filters.minRating !== undefined) conditions.push(gte(movies.rating, filters.minRating))
    if (filters.maxRating !== undefined) conditions.push(lte(movies.rating, filters.maxRating))
    if (filters.minYear !== undefined) conditions.push(gte(movies.year, filters.minYear))
    if (filters.maxYear !== undefined) conditions.push(lte(movies.year, filters.maxYear))
    if (filters.minVotes !== undefined) conditions.push(gte(movies.votes, filters.minVotes))
    if (filters.maxVotes !== undefined) conditions.push(lte(movies.votes, filters.maxVotes))
    if (filters.inWatchlist !== undefined) conditions.push(sql`COALESCE(${userMovies.inWatchlist}, false) = ${filters.inWatchlist}`)
    if (filters.watched !== undefined) conditions.push(sql`COALESCE(${userMovies.watched}, false) = ${filters.watched}`)
    if (filters.people && filters.people.length) {
      const ids = sql.join(filters.people.map((p) => sql`${p}`), sql`, `)
      const rolePred = rolePredicateSql(filters.peopleRole ?? 'any')
      const subquery = sql`(
        SELECT ${movieCredits.movieId}
        FROM ${movieCredits}
        WHERE ${movieCredits.personId} IN (${ids}) AND (${rolePred})
        GROUP BY ${movieCredits.movieId}
        HAVING COUNT(DISTINCT ${movieCredits.personId}) = ${filters.people.length}
      )`
      conditions.push(sql`${movies.id} IN ${subquery}`)
    }

    const where = conditions.length ? and(...conditions) : undefined
    // Shuffle: order by a hash of (id, seed) so the random order is deterministic
    // for a given seed — stable across pages and refetches, with id as tiebreak.
    const order =
      filters.sortBy === 'random'
        ? [asc(sql`md5(${movies.id} || ${filters.seed ?? ''})`), asc(movies.id)]
        : (() => {
            const sortCol = {
              title: movies.title,
              rating: movies.rating,
              votes: movies.votes,
              year: movies.year,
              createdAt: movies.createdAt,
            }[filters.sortBy as Exclude<NonNullable<MovieFilters['sortBy']>, 'random'>]!
            return [filters.sortOrder === 'asc' ? asc(sortCol) : desc(sortCol)]
          })()
    const skip = ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20)

    const joinCondition = and(eq(userMovies.movieId, movies.id), eq(userMovies.userId, userId))

    const [rows, [{ total }]] = await Promise.all([
      db
        .select(withUserFlags(userId))
        .from(movies)
        .leftJoin(userMovies, joinCondition)
        .where(where)
        .orderBy(...order)
        .limit(filters.pageSize!)
        .offset(skip),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(movies)
        .leftJoin(userMovies, joinCondition)
        .where(where),
    ])

    return { movies: rows, total, page: filters.page, pageSize: filters.pageSize }
  })

  app.get<{ Params: { id: string } }>('/movies/:id', async (req, reply) => {
    const userId = req.user.sub
    const [movie] = await db
      .select(withUserFlags(userId))
      .from(movies)
      .leftJoin(userMovies, and(eq(userMovies.movieId, movies.id), eq(userMovies.userId, userId)))
      .where(eq(movies.id, req.params.id))
      .limit(1)
    if (!movie) return reply.code(404).send({ error: 'Not found' })

    const creditRows = await db
      .select({
        id: people.id,
        name: people.name,
        category: movieCredits.category,
        ordering: movieCredits.ordering,
        job: movieCredits.job,
        characters: movieCredits.characters,
      })
      .from(movieCredits)
      .innerJoin(people, eq(people.id, movieCredits.personId))
      .where(eq(movieCredits.movieId, movie.id))
      .orderBy(asc(movieCredits.ordering))

    const directors: MovieCreditPerson[] = []
    const writers: MovieCreditPerson[] = []
    const producers: MovieCreditPerson[] = []
    const cast: MovieCreditPerson[] = []
    const crew: MovieCreditPerson[] = []
    for (const c of creditRows) {
      const person: MovieCreditPerson = {
        id: c.id,
        name: c.name,
        category: c.category,
        ordering: c.ordering,
        job: c.job,
        characters: c.characters,
      }
      if (c.category === 'director') directors.push(person)
      else if (c.category === 'writer') writers.push(person)
      else if (c.category === 'producer') producers.push(person)
      else if (c.category === 'actor' || c.category === 'actress' || c.category === 'self') cast.push(person)
      else crew.push(person)
    }
    return { ...movie, directors, writers, producers, cast, crew }
  })

  app.patch<{ Params: { id: string } }>('/movies/:id/watchlist', async (req, reply) => {
    const userId = req.user.sub
    const [exists] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, req.params.id)).limit(1)
    if (!exists) return reply.code(404).send({ error: 'Not found' })

    const [current] = await db
      .select({ inWatchlist: userMovies.inWatchlist })
      .from(userMovies)
      .where(and(eq(userMovies.userId, userId), eq(userMovies.movieId, req.params.id)))
      .limit(1)

    const next = !(current?.inWatchlist ?? false)
    await upsertUserMovie(userId, req.params.id, { inWatchlist: next })

    const [movie] = await db
      .select(withUserFlags(userId))
      .from(movies)
      .leftJoin(userMovies, and(eq(userMovies.movieId, movies.id), eq(userMovies.userId, userId)))
      .where(eq(movies.id, req.params.id))
      .limit(1)
    return movie
  })

  app.patch<{ Params: { id: string } }>('/movies/:id/watched', async (req, reply) => {
    const userId = req.user.sub
    const [exists] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, req.params.id)).limit(1)
    if (!exists) return reply.code(404).send({ error: 'Not found' })

    const [current] = await db
      .select({ watched: userMovies.watched })
      .from(userMovies)
      .where(and(eq(userMovies.userId, userId), eq(userMovies.movieId, req.params.id)))
      .limit(1)

    const next = !(current?.watched ?? false)
    await upsertUserMovie(userId, req.params.id, { watched: next })

    const [movie] = await db
      .select(withUserFlags(userId))
      .from(movies)
      .leftJoin(userMovies, and(eq(userMovies.movieId, movies.id), eq(userMovies.userId, userId)))
      .where(eq(movies.id, req.params.id))
      .limit(1)
    return movie
  })

}

async function upsertUserMovie(
  userId: string,
  movieId: string,
  patch: { inWatchlist?: boolean; watched?: boolean },
) {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.inWatchlist !== undefined) set.inWatchlist = patch.inWatchlist
  if (patch.watched !== undefined) set.watched = patch.watched

  await db
    .insert(userMovies)
    .values({
      userId,
      movieId,
      inWatchlist: patch.inWatchlist ?? false,
      watched: patch.watched ?? false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userMovies.userId, userMovies.movieId],
      set,
    })
}
