import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { moviesApi } from '@/api/movies'

export function DeleteMovieButton({ movieId }: { movieId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => moviesApi.delete(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] })
      navigate('/movies')
    },
  })

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => { if (confirm('Delete this movie?')) mutate() }}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
