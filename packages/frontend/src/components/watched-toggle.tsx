import { Eye } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'

export function WatchedToggle({ movieId, watched }: { movieId: string; watched: boolean }) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => moviesApi.toggleWatched(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] })
    },
  })

  return (
    <button
      disabled={isPending}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); mutate() }}
      title={watched ? 'Mark as unwatched' : 'Mark as watched'}
      className="h-7 w-7 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-50"
    >
      <Eye className={`h-3.5 w-3.5 ${watched ? 'fill-green-400 text-green-400' : ''}`} />
    </button>
  )
}
