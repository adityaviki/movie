import { pgTable, text, integer, doublePrecision, boolean, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'

export const movies = pgTable('Movie', {
  id: text('id').primaryKey(),
  imdbId: text('imdbId').unique(),
  title: text('title').notNull(),
  year: integer('year'),
  type: text('type'),
  rating: doublePrecision('rating'),
  votes: integer('votes'),
  genres: text('genres').array().notNull().default([]),
  runtime: text('runtime'),
  certificate: text('certificate'),
  description: text('description'),
  posterUrl: text('posterUrl'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const users = pgTable('User', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  name: text('name'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const userMovies = pgTable(
  'UserMovie',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    movieId: text('movieId')
      .notNull()
      .references(() => movies.id, { onDelete: 'cascade' }),
    inWatchlist: boolean('inWatchlist').notNull().default(false),
    watched: boolean('watched').notNull().default(false),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.movieId] })],
)

export const people = pgTable('Person', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  birthYear: integer('birthYear'),
  deathYear: integer('deathYear'),
  professions: text('professions').array().notNull().default([]),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const movieCredits = pgTable(
  'MovieCredit',
  {
    movieId: text('movieId')
      .notNull()
      .references(() => movies.id, { onDelete: 'cascade' }),
    personId: text('personId')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    ordering: integer('ordering').notNull(),
    job: text('job'),
    characters: text('characters').array(),
  },
  (t) => [
    primaryKey({ columns: [t.movieId, t.personId, t.category, t.ordering] }),
    index('MovieCredit_movieId_idx').on(t.movieId),
    index('MovieCredit_personId_idx').on(t.personId),
  ],
)

export type Movie = typeof movies.$inferSelect
export type NewMovie = typeof movies.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserMovie = typeof userMovies.$inferSelect
export type NewUserMovie = typeof userMovies.$inferInsert
export type Person = typeof people.$inferSelect
export type NewPerson = typeof people.$inferInsert
export type MovieCredit = typeof movieCredits.$inferSelect
export type NewMovieCredit = typeof movieCredits.$inferInsert
