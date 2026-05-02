import type { Movie, MovieFilters, MovieFormData, MoviesResponse } from '@movie/shared'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

function buildQuery(filters: MovieFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.genre) params.set('genre', filters.genre)
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
  if (filters.maxRating !== undefined) params.set('maxRating', String(filters.maxRating))
  if (filters.year !== undefined) params.set('year', String(filters.year))
  if (filters.type) params.set('type', filters.type)
  if (filters.inWatchlist !== undefined) params.set('inWatchlist', String(filters.inWatchlist))
  if (filters.watched !== undefined) params.set('watched', String(filters.watched))
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

  get: (id: string) =>
    request<Movie>(`/api/movies/${id}`),

  create: (data: MovieFormData) =>
    request<Movie>('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: MovieFormData) =>
    request<Movie>(`/api/movies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/movies/${id}`, { method: 'DELETE' }),

  toggleWatchlist: (id: string) =>
    request<Movie>(`/api/movies/${id}/watchlist`, { method: 'PATCH' }),

  toggleWatched: (id: string) =>
    request<Movie>(`/api/movies/${id}/watched`, { method: 'PATCH' }),
}
