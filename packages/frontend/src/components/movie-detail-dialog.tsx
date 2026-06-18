import { useQuery } from '@tanstack/react-query'
import { Star, ExternalLink, X } from 'lucide-react'
import type { MovieCreditPerson, MovieDetail } from '@movie/shared'
import { moviesApi } from '@/api/movies'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { WatchlistToggle } from '@/components/watchlist-toggle'
import { WatchedToggle } from '@/components/watched-toggle'

const MAX_CAST = 10
const MAX_PRODUCERS = 6

const TYPE_LABELS: Record<string, string> = {
  movie: 'Movie',
  tvSeries: 'TV Series',
  tv_series: 'TV Series',
  tvMiniSeries: 'Mini-Series',
  tvSpecial: 'TV Special',
  short: 'Short',
  video: 'Video',
  videoGame: 'Video Game',
}

function prettyType(type: string) {
  return TYPE_LABELS[type] ?? type
}

function CreditSection({ label, people }: { label: string; people: MovieCreditPerson[] }) {
  if (people.length === 0) return null
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
      <p className="text-sm leading-relaxed">
        {people.map((p, i) => (
          <span key={`${p.id}-${p.ordering}`}>
            {p.name}
            {p.characters && p.characters.length > 0 && (
              <span className="text-muted-foreground"> as {p.characters.join(', ')}</span>
            )}
            {i < people.length - 1 && <span className="text-muted-foreground">, </span>}
          </span>
        ))}
      </p>
    </div>
  )
}

function hasCredits(movie: MovieDetail) {
  return movie.directors.length > 0 || movie.writers.length > 0 || movie.cast.length > 0 || movie.producers.length > 0
}

function Credits({ movie }: { movie: MovieDetail }) {
  if (!hasCredits(movie)) return null
  return (
    <div className="space-y-3 text-left">
      <CreditSection label="Directors" people={movie.directors} />
      <CreditSection label="Writers" people={movie.writers} />
      <CreditSection label="Cast" people={movie.cast.slice(0, MAX_CAST)} />
      <CreditSection label="Producers" people={movie.producers.slice(0, MAX_PRODUCERS)} />
    </div>
  )
}

function Actions({ movie }: { movie: MovieDetail }) {
  return (
    <>
      <WatchlistToggle movieId={movie.id} inWatchlist={movie.inWatchlist} label />
      <WatchedToggle movieId={movie.id} watched={movie.watched} label />
      {movie.imdbId && (
        <a
          href={`https://www.imdb.com/title/${movie.imdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button variant="outline" className="w-full justify-start gap-2.5">
            <ExternalLink className="h-4 w-4" />IMDB
          </Button>
        </a>
      )}
    </>
  )
}

function MetaHeader({ movie }: { movie: MovieDetail }) {
  return (
    <div className="space-y-2.5">
      <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-balance">{movie.title}</h2>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-foreground/80">
        {movie.year && <span>{movie.year}</span>}
        {movie.year && movie.runtime && <span className="text-foreground/40">•</span>}
        {movie.runtime && <span>{movie.runtime}</span>}
        {movie.certificate && <Badge variant="outline" className="font-normal bg-background/60">{movie.certificate}</Badge>}
        {movie.type && <Badge variant="secondary" className="font-normal">{prettyType(movie.type)}</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {movie.rating && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 ring-1 ring-border/60 backdrop-blur-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-base font-semibold tabular-nums">{movie.rating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">/10</span>
            {movie.votes != null && (
              <span className="text-sm text-muted-foreground">· {movie.votes.toLocaleString()} votes</span>
            )}
          </div>
        )}
        {movie.genres.map((g) => <Badge key={g} variant="secondary" className="py-1">{g}</Badge>)}
      </div>
    </div>
  )
}

export function MovieDetailDialog({
  movieId,
  open,
  onOpenChange,
}: {
  movieId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movies', movieId],
    queryFn: () => moviesApi.get(movieId!),
    enabled: !!movieId && open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="block top-0 left-0 translate-x-0 translate-y-0 max-w-none w-screen h-[100dvh] max-h-[100dvh] rounded-none border-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border md:max-w-3xl overflow-y-auto scrollbar-minimal p-0"
      >
        {/* Sticky close button — stays pinned to the top-right while the dialog scrolls */}
        <div className="sticky top-0 z-50 h-0">
          <DialogClose className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-foreground ring-1 ring-border/50 backdrop-blur-sm opacity-90 transition hover:bg-background hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        {isLoading || !movie ? (
          <div className="p-6 space-y-4">
            <DialogTitle className="sr-only">Loading</DialogTitle>
            <DialogDescription className="sr-only">Loading movie details</DialogDescription>
            <div className="w-full aspect-[2/3] max-h-[55vh] bg-muted rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <DialogTitle className="sr-only">{movie.title}</DialogTitle>
            <DialogDescription className="sr-only">
              {movie.description ?? `${movie.title} details`}
            </DialogDescription>

            {/* Full-bleed poster hero with the headline overlaid on a gradient scrim */}
            <div className="relative w-full aspect-[2/3] max-h-[68vh] sm:max-h-[56vh] overflow-hidden bg-muted">
              {movie.posterUrl ? (
                <img src={movie.posterUrl} alt={movie.title} className="absolute inset-0 w-full h-full object-cover object-top" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No Poster</div>
              )}
              {/* top scrim so the close button stays legible over bright artwork */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" aria-hidden />
              {/* bottom scrim fading the poster into the background */}
              <div className="absolute inset-x-0 bottom-0 top-1/4 bg-gradient-to-t from-background from-20% via-background/85 to-transparent pointer-events-none" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <MetaHeader movie={movie} />
              </div>
            </div>
            <div className="p-5 sm:p-6 space-y-5">
              {movie.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{movie.description}</p>
              )}
              <Credits movie={movie} />
              <div className="flex flex-col gap-2">
                <Actions movie={movie} />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
