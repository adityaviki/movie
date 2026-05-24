import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'
import { savedViewsApi } from '@/api/saved-views'
import { MovieGrid } from '@/components/movie-grid'
import { MovieDetailDialog } from '@/components/movie-detail-dialog'
import { ActiveFilters, MovieFiltersSidebar, MovieFiltersTopbar, MovieSortControl } from '@/components/movie-filters'
import { Pagination } from '@/components/pagination'
import { SavedViewsMenu, currentParamsString } from '@/components/saved-views-menu'
import type { MovieFilters as Filters, PeopleRole } from '@movie/shared'

const VALID_PEOPLE_ROLES: PeopleRole[] = ['any', 'director', 'writer', 'producer', 'cast']

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
    people: peopleList.length ? peopleList : undefined,
    peopleRole,
    inWatchlist: searchParams.get('watchlist') === 'true' ? true : searchParams.get('watchlist') === 'false' ? false : undefined,
    watched: (() => {
      const v = searchParams.get('watched')
      if (v === 'true') return true
      if (v === 'false') return false
      return undefined
    })(),
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

  const { data: savedViews } = useQuery({
    queryKey: ['saved-views'],
    queryFn: savedViewsApi.list,
    staleTime: 60_000,
  })

  const autoApplied = useRef(false)
  useEffect(() => {
    if (autoApplied.current) return
    if (!savedViews) return
    autoApplied.current = true
    if (currentParamsString(searchParams) !== '') return
    const def = savedViews.defaultView
    if (!def) return
    const params = savedViews.views.find((v) => v.id === def)?.params
    if (!params) return
    setSearchParams(new URLSearchParams(params), { replace: true })
  }, [savedViews, searchParams, setSearchParams])

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

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
      <aside className="lg:sticky lg:top-20 lg:w-64 lg:shrink-0 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-minimal rounded-xl bg-card/60 backdrop-blur-md border border-border/50 px-4 py-4">
        <MovieFiltersSidebar genres={genres} />
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="rounded-xl bg-card/60 backdrop-blur-md border border-border/50 px-4 py-3 flex flex-wrap items-center gap-2">
          <SavedViewsMenu />
          <div className="flex-1 min-w-0">
            <MovieFiltersTopbar />
          </div>
          <MovieSortControl />
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
          <div className="flex justify-center pt-2">
            <Pagination page={page} pageSize={pageSize} total={total} />
          </div>
        )}
      </div>

      <MovieDetailDialog
        movieId={openMovieId}
        open={!!openMovieId}
        onOpenChange={closeDialog}
      />
    </div>
  )
}
