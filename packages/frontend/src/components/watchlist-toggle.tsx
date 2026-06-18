import { Bookmark } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'
import { cn } from '@/lib/utils'

export function WatchlistToggle({ movieId, inWatchlist, label = false }: { movieId: string; inWatchlist: boolean; label?: boolean }) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => moviesApi.toggleWatchlist(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] })
    },
  })

  if (label) {
    return (
      <button
        disabled={isPending}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); mutate() }}
        className="flex w-full items-center gap-2.5 h-9 px-3 rounded-md bg-muted/70 hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
      >
        <Bookmark className={cn('h-4 w-4', inWatchlist && 'fill-yellow-400 text-yellow-400')} />
        {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
      </button>
    )
  }

  return (
    <button
      disabled={isPending}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); mutate() }}
      title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-50"
    >
      <Bookmark className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${inWatchlist ? 'fill-yellow-400 text-yellow-400' : ''}`} />
    </button>
  )
}
