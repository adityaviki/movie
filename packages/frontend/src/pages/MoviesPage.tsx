import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'
import { MovieGrid } from '@/components/movie-grid'
import { MovieFilters } from '@/components/movie-filters'
import { Pagination } from '@/components/pagination'
import { FetchNewButton } from '@/components/fetch-new-button'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { MovieFilters as Filters } from '@movie/shared'

export function MoviesPage() {
  const [searchParams] = useSearchParams()

  const page = Number(searchParams.get('page') || 1)
  const pageSize = 20

  const filters: Filters = {
    search: searchParams.get('search') || undefined,
    genre: searchParams.get('genre') || undefined,
    sortBy: (searchParams.get('sortBy') as Filters['sortBy']) || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as Filters['sortOrder']) || 'desc',
    inWatchlist: searchParams.get('watchlist') === 'true' ? true : searchParams.get('watchlist') === 'false' ? false : undefined,
    watched: searchParams.get('watched') === 'true' ? true : searchParams.get('watched') === 'false' ? false : undefined,
    page,
    pageSize,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['movies', filters],
    queryFn: () => moviesApi.list(filters),
  })

  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: moviesApi.genres,
    staleTime: Infinity,
  })

  const total = data?.total ?? 0
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movies</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading...' : total === 0 ? 'No movies found' : `${start}–${end} of ${total.toLocaleString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <FetchNewButton />
          <Link to="/movies/new"><Button size="sm"><Plus className="mr-1 h-4 w-4" />Add</Button></Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 px-4 py-3">
        <MovieFilters genres={genres} />
        <Pagination page={page} pageSize={pageSize} total={total} />
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <MovieGrid movies={data?.movies ?? []} />
      )}
    </div>
  )
}
