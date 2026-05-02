import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { WatchlistToggle } from '@/components/watchlist-toggle'
import { WatchedToggle } from '@/components/watched-toggle'
import { DeleteMovieButton } from '@/components/delete-movie-button'
import { Star, ArrowLeft, Pencil, ExternalLink } from 'lucide-react'

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movies', id],
    queryFn: () => moviesApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-xl" />
  if (!movie) return <div className="text-center py-12 text-muted-foreground">Movie not found</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/movies" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />Back to Movies
      </Link>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="shrink-0">
          <div className="relative w-[250px] aspect-[2/3] bg-muted rounded-lg overflow-hidden">
            {movie.posterUrl
              ? <img src={movie.posterUrl} alt={movie.title} className="object-cover w-full h-full" />
              : <div className="flex h-full items-center justify-center text-muted-foreground">No Poster</div>
            }
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{movie.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime && <span>{movie.runtime}</span>}
              {movie.certificate && <Badge variant="outline">{movie.certificate}</Badge>}
              {movie.type && <Badge variant="secondary">{movie.type}</Badge>}
            </div>
          </div>
          {movie.rating && (
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-xl font-semibold">{movie.rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">/10</span>
              {movie.votes && <span className="text-sm text-muted-foreground">({movie.votes.toLocaleString()} votes)</span>}
            </div>
          )}
          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((g) => <Badge key={g} variant="secondary">{g}</Badge>)}
            </div>
          )}
          {movie.description && <p className="text-muted-foreground leading-relaxed">{movie.description}</p>}
          <Separator />
          <div className="flex items-center gap-3 flex-wrap">
            <WatchlistToggle movieId={movie.id} inWatchlist={movie.inWatchlist} />
            <span className="text-sm text-muted-foreground">{movie.inWatchlist ? 'In Watchlist' : 'Not in Watchlist'}</span>
            <WatchedToggle movieId={movie.id} watched={movie.watched} />
            <span className="text-sm text-muted-foreground">{movie.watched ? 'Watched' : 'Not Watched'}</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to={`/movies/${movie.id}/edit`}>
              <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Edit</Button>
            </Link>
            {movie.imdbId && (
              <a href={`https://www.imdb.com/title/${movie.imdbId}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><ExternalLink className="mr-2 h-4 w-4" />IMDB</Button>
              </a>
            )}
            <DeleteMovieButton movieId={movie.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
