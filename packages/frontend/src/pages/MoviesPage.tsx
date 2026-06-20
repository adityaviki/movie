import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'
import { MovieGrid } from '@/components/movie-grid'
import { MovieDetailDialog } from '@/components/movie-detail-dialog'
import { ActiveFilters, LibraryToggles, MobileFiltersSheet, MovieFiltersSidebar, MovieReshuffleButton, MovieSortControl } from '@/components/movie-filters'
import { Pagination } from '@/components/pagination'
import type { MovieFilters as Filters, PeopleRole } from '@movie/shared'

const VALID_PEOPLE_ROLES: PeopleRole[] = ['any', 'director', 'writer', 'producer', 'cast']

// Shared so the live list query and on-demand adjacent-page fetches use an
// identical query key (only `page` differs).
function moviesQueryOptions(filters: Filters) {
  return {
    queryKey: ['movies', filters] as const,
    queryFn: () => moviesApi.list(filters),
    staleTime: 30_000,
  }
}

export function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Number(searchParams.get('page') || 1)
  const pageSize = 20

  const numParam = (key: string) => {
    const v = searchParams.get(key)
    if (!v) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  const genresList = (searchParams.get('genres') ?? '').split(',').map((g) => g.trim()).filter(Boolean)
  const peopleList = (searchParams.get('people') ?? '').split(',').map((p) => p.trim()).filter(Boolean)
  const peopleRoleParam = searchParams.get('peopleRole') as PeopleRole | null
  const peopleRole: PeopleRole | undefined =
    peopleList.length && peopleRoleParam && VALID_PEOPLE_ROLES.includes(peopleRoleParam) ? peopleRoleParam : undefined

  const filters: Filters = {
    search: searchParams.get('search') || undefined,
    genres: genresList.length ? genresList : undefined,
    type: searchParams.get('type') || undefined,
    minRating: numParam('minRating'),
    maxRating: numParam('maxRating'),
    minYear: numParam('minYear'),
    maxYear: numParam('maxYear'),
    minVotes: numParam('minVotes'),
    maxVotes: numParam('maxVotes'),
    sortBy: (searchParams.get('sortBy') as Filters['sortBy']) || 'year',
    sortOrder: (searchParams.get('sortOrder') as Filters['sortOrder']) || 'desc',
    seed: searchParams.get('seed') || undefined,
    people: peopleList.length ? peopleList : undefined,
    peopleRole,
    inWatchlist: searchParams.get('watchlist') === 'true' ? true : searchParams.get('watchlist') === 'false' ? false : undefined,
    // Watched movies are hidden by default; the Watched toggle (watched=true) shows them.
    watched: searchParams.get('watched') === 'true' ? true : false,
    page,
    pageSize,
  }

  const { data, isLoading } = useQuery(moviesQueryOptions(filters))

  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: moviesApi.genres,
    staleTime: Infinity,
  })

  const total = data?.total ?? 0
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const openMovieId = searchParams.get('movie')
  const closeDialog = (open: boolean) => {
    if (open) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('movie')
      return next
    })
  }

  // Prev/next navigation across the whole result set. Stepping past the edge of
  // the current page pulls in the neighbouring page on demand.
  const queryClient = useQueryClient()
  const navigating = useRef(false)
  const movieList = data?.movies ?? []
  const openIndex = openMovieId ? movieList.findIndex((m) => m.id === openMovieId) : -1
  const totalPages = Math.ceil(total / pageSize)
  const globalIndex = openIndex >= 0 ? (page - 1) * pageSize + openIndex : -1

  const step = async (dir: -1 | 1) => {
    if (openIndex < 0 || navigating.current) return
    const target = openIndex + dir
    if (target >= 0 && target < movieList.length) {
      // Still on this page — just swap the movie param.
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('movie', movieList[target].id)
        return next
      })
      return
    }
    // Ran off the page edge — fetch the neighbouring page and open its end movie.
    const targetPage = page + dir
    if (targetPage < 1 || targetPage > totalPages) return
    navigating.current = true
    try {
      const res = await queryClient.fetchQuery(moviesQueryOptions({ ...filters, page: targetPage }))
      const m = dir === 1 ? res.movies[0] : res.movies[res.movies.length - 1]
      if (m) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.set('page', String(targetPage))
          next.set('movie', m.id)
          return next
        })
      }
    } catch {
      // ignore fetch failures — leave the dialog where it is
    } finally {
      navigating.current = false
    }
  }

  const onPrev = globalIndex > 0 ? () => step(-1) : undefined
  const onNext = globalIndex >= 0 && globalIndex < total - 1 ? () => step(1) : undefined

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
      <aside className="hidden lg:block lg:sticky lg:top-20 lg:w-72 lg:shrink-0 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-minimal rounded-xl bg-card/60 backdrop-blur-md border border-border/50 px-4 py-4">
        <MovieFiltersSidebar genres={genres} />
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="rounded-xl bg-card/60 backdrop-blur-md border border-border/50 px-3 py-2 sm:px-4 sm:py-3 flex flex-wrap items-center gap-2">
          <MobileFiltersSheet genres={genres} />
          <div className="hidden lg:flex items-center gap-2">
            <LibraryToggles />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <MovieReshuffleButton />
            <MovieSortControl />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <ActiveFilters />
          </div>
          <div className="text-sm text-muted-foreground shrink-0">
            {isLoading ? 'Loading...' : total === 0 ? 'No movies found' : `${start}–${end} of ${total.toLocaleString()}`}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <MovieGrid movies={data?.movies ?? []} />
        )}

        {total > pageSize && (
          <div className="flex sm:justify-center pt-2">
            <Pagination page={page} pageSize={pageSize} total={total} />
          </div>
        )}
      </div>

      <MovieDetailDialog
        movieId={openMovieId}
        open={!!openMovieId}
        onOpenChange={closeDialog}
        onPrev={onPrev}
        onNext={onNext}
      />
    </div>
  )
}
