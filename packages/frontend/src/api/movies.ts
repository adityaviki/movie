import type { Movie, MovieDetail, MovieFilters, MoviesResponse } from '@movie/shared'
import { request } from './client'

function buildQuery(filters: MovieFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.genres && filters.genres.length) params.set('genres', filters.genres.join(','))
  if (filters.type) params.set('type', filters.type)
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
  if (filters.maxRating !== undefined) params.set('maxRating', String(filters.maxRating))
  if (filters.minYear !== undefined) params.set('minYear', String(filters.minYear))
  if (filters.maxYear !== undefined) params.set('maxYear', String(filters.maxYear))
  if (filters.minVotes !== undefined) params.set('minVotes', String(filters.minVotes))
  if (filters.maxVotes !== undefined) params.set('maxVotes', String(filters.maxVotes))
  if (filters.inWatchlist !== undefined) params.set('inWatchlist', String(filters.inWatchlist))
  if (filters.watched !== undefined) params.set('watched', String(filters.watched))
  if (filters.people && filters.people.length) params.set('people', filters.people.join(','))
  if (filters.peopleRole) params.set('peopleRole', filters.peopleRole)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
  return params.toString()
}

export const moviesApi = {
  list: (filters: MovieFilters) =>
    request<MoviesResponse>(`/api/movies?${buildQuery(filters)}`),

  genres: () =>
    request<string[]>('/api/movies/genres'),

  types: () =>
    request<{ type: string; count: number }[]>('/api/movies/types'),

  get: (id: string) =>
    request<MovieDetail>(`/api/movies/${id}`),

  toggleWatchlist: (id: string) =>
    request<Movie>(`/api/movies/${id}/watchlist`, { method: 'PATCH' }),

  toggleWatched: (id: string) =>
    request<Movie>(`/api/movies/${id}/watched`, { method: 'PATCH' }),
}
