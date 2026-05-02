export interface MovieFilters {
  search?: string;
  genre?: string;
  minRating?: number;
  maxRating?: number;
  year?: number;
  type?: string;
  inWatchlist?: boolean;
  watched?: boolean;
  sortBy?: "title" | "rating" | "year" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface MovieFormData {
  title: string;
  imdbId?: string;
  year?: number;
  type?: string;
  rating?: number;
  votes?: number;
  genres: string[];
  runtime?: string;
  certificate?: string;
  description?: string;
  posterUrl?: string;
  inWatchlist?: boolean;
  watched?: boolean;
}
