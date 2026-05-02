import { pgTable, text, integer, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core'

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
  inWatchlist: boolean('inWatchlist').notNull().default(false),
  watched: boolean('watched').notNull().default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export type Movie = typeof movies.$inferSelect
export type NewMovie = typeof movies.$inferInsert
