import { useQuery } from '@tanstack/react-query'
import { Star, ExternalLink } from 'lucide-react'
import type { MovieCreditPerson } from '@movie/shared'
import { moviesApi } from '@/api/movies'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { WatchlistToggle } from '@/components/watchlist-toggle'
import { WatchedToggle } from '@/components/watched-toggle'

const MAX_CAST = 10
const MAX_PRODUCERS = 6

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
      <DialogContent className="top-0 left-0 translate-x-0 translate-y-0 max-w-none w-screen h-[100dvh] max-h-[100dvh] rounded-none border-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-full sm:h-auto sm:max-h-[92vh] sm:rounded-lg sm:border md:max-w-3xl overflow-y-auto scrollbar-minimal p-4 sm:p-6">
        {isLoading || !movie ? (
          <div className="space-y-3">
            <DialogTitle className="sr-only">Loading</DialogTitle>
            <DialogDescription className="sr-only">Loading movie details</DialogDescription>
            <div className="h-72 bg-muted rounded-lg animate-pulse" />
          </div>
        ) : (
          <>
            <DialogTitle className="sr-only">{movie.title}</DialogTitle>
            <DialogDescription className="sr-only">
              {movie.description ?? `${movie.title} details`}
            </DialogDescription>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              <div className="shrink-0 mx-auto md:mx-0">
                <div className="relative w-[140px] sm:w-[180px] md:w-[200px] aspect-[2/3] bg-muted rounded-lg overflow-hidden">
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={movie.title} className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No Poster</div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold leading-tight">{movie.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                    {movie.year && <span>{movie.year}</span>}
                    {movie.runtime && <span>{movie.runtime}</span>}
                    {movie.certificate && <Badge variant="outline">{movie.certificate}</Badge>}
                    {movie.type && <Badge variant="secondary">{movie.type}</Badge>}
                  </div>
                </div>
                {movie.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-semibold">{movie.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">/10</span>
                    {movie.votes && (
                      <span className="text-sm text-muted-foreground">({movie.votes.toLocaleString()} votes)</span>
                    )}
                  </div>
                )}
                {movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map((g) => <Badge key={g} variant="secondary">{g}</Badge>)}
                  </div>
                )}
                {movie.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{movie.description}</p>
                )}
                {(movie.directors.length > 0 || movie.writers.length > 0 || movie.cast.length > 0 || movie.producers.length > 0) && (
                  <div className="space-y-3 pt-1">
                    <CreditSection label="Directors" people={movie.directors} />
                    <CreditSection label="Writers" people={movie.writers} />
                    <CreditSection label="Cast" people={movie.cast.slice(0, MAX_CAST)} />
                    <CreditSection label="Producers" people={movie.producers.slice(0, MAX_PRODUCERS)} />
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-3 flex-wrap">
                  <WatchlistToggle movieId={movie.id} inWatchlist={movie.inWatchlist} />
                  <span className="text-sm text-muted-foreground">
                    {movie.inWatchlist ? 'In Watchlist' : 'Not in Watchlist'}
                  </span>
                  <WatchedToggle movieId={movie.id} watched={movie.watched} />
                  <span className="text-sm text-muted-foreground">
                    {movie.watched ? 'Watched' : 'Not Watched'}
                  </span>
                </div>
                {movie.imdbId && (
                  <div className="flex gap-3 flex-wrap">
                    <a href={`https://www.imdb.com/title/${movie.imdbId}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />IMDB
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
