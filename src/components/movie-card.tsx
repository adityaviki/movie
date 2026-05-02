import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { WatchlistToggle } from "@/components/watchlist-toggle";
import { WatchedToggle } from "@/components/watched-toggle";
import type { Movie } from "@/generated/prisma/client";

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link href={`/movies/${movie.id}`} className="group block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-md transition-shadow duration-300 group-hover:shadow-xl">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No Poster
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {movie.watched && (
          <div className="absolute top-0 left-0 w-10 h-10 overflow-hidden pointer-events-none">
            <div className="absolute top-[5px] left-[-14px] w-[60px] bg-primary/85 text-primary-foreground text-[8px] font-semibold text-center py-[2px] rotate-[-45deg] shadow-sm backdrop-blur-sm">
              SEEN
            </div>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <WatchlistToggle movieId={movie.id} inWatchlist={movie.inWatchlist} />
          <WatchedToggle movieId={movie.id} watched={movie.watched} />
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
          {movie.year && <span>{movie.year}</span>}
          {movie.runtime && (
            <>
              <span className="text-border">·</span>
              <span>{movie.runtime}</span>
            </>
          )}
          {movie.rating && (
            <>
              <span className="text-border">·</span>
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {movie.rating.toFixed(1)}
              </span>
            </>
          )}
          {movie.votes && (
            <>
              <span className="text-border">·</span>
              <span>{movie.votes >= 1000 ? `${(movie.votes / 1000).toFixed(0)}k` : movie.votes}</span>
            </>
          )}
        </div>
        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {movie.genres.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {genre}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
