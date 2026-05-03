import { pgTable, text, integer, doublePrecision, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core'

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
  defaultView: text('defaultView'),
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

export const savedViews = pgTable('SavedView', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  params: text('params').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export type Movie = typeof movies.$inferSelect
export type NewMovie = typeof movies.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserMovie = typeof userMovies.$inferSelect
export type NewUserMovie = typeof userMovies.$inferInsert
export type SavedView = typeof savedViews.$inferSelect
export type NewSavedView = typeof savedViews.$inferInsert
