import { Eye } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'
import { cn } from '@/lib/utils'

export function WatchedToggle({ movieId, watched, label = false }: { movieId: string; watched: boolean; label?: boolean }) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => moviesApi.toggleWatched(movieId),
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
        <Eye className={cn('h-4 w-4', watched && 'fill-green-400/20 text-green-400')} />
        {watched ? 'Watched' : 'Mark Watched'}
      </button>
    )
  }

  return (
    <button
      disabled={isPending}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); mutate() }}
      title={watched ? 'Mark as unwatched' : 'Mark as watched'}
      className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-50"
    >
      <Eye className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${watched ? 'fill-green-400 text-green-400' : ''}`} />
    </button>
  )
}
