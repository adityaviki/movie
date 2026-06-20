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

export interface MovieCreditPerson {
  id: string
  name: string
  category: string
  ordering: number
  job: string | null
  characters: string[] | null
}

export interface MovieDetail extends Movie {
  directors: MovieCreditPerson[]
  writers: MovieCreditPerson[]
  producers: MovieCreditPerson[]
  cast: MovieCreditPerson[]
  crew: MovieCreditPerson[]
}

export interface MovieFilters {
  search?: string
  genres?: string[]
  type?: string
  minRating?: number
  maxRating?: number
  minYear?: number
  maxYear?: number
  minVotes?: number
  maxVotes?: number
  inWatchlist?: boolean
  watched?: boolean
  people?: string[]
  peopleRole?: PeopleRole
  sortBy?: 'title' | 'rating' | 'votes' | 'year' | 'createdAt' | 'random'
  sortOrder?: 'asc' | 'desc'
  // Seed for stable random ordering when sortBy === 'random'.
  seed?: string
  page?: number
  pageSize?: number
}

export type PeopleRole = 'any' | 'director' | 'writer' | 'producer' | 'cast'

export interface PersonSearchResult {
  id: string
  name: string
  professions: string[]
  credits: number
}

export interface MoviesResponse {
  movies: Movie[]
  total: number
  page: number
  pageSize: number
}

export interface User {
  id: string
  email: string
  username: string
  name: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
}

