export interface Movie {
  id: string
  imdbId: string | null
  title: string
  year: number | null
  type: string | null
  rating: number | null
  votes: number | null
  genres: string[]
  runtime: string | null
  certificate: string | null
  description: string | null
  posterUrl: string | null
  inWatchlist: boolean
  watched: boolean
  createdAt: string
  updatedAt: string
}

export interface MovieFilters {
  search?: string
  genre?: string
  minRating?: number
  maxRating?: number
  year?: number
  type?: string
  inWatchlist?: boolean
  watched?: boolean
  sortBy?: 'title' | 'rating' | 'year' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface MovieFormData {
  title: string
  imdbId?: string
  year?: number
  type?: string
  rating?: number
  votes?: number
  genres: string[]
  runtime?: string
  certificate?: string
  description?: string
  posterUrl?: string
  inWatchlist?: boolean
  watched?: boolean
}

export interface MoviesResponse {
  movies: Movie[]
  total: number
  page: number
  pageSize: number
}
