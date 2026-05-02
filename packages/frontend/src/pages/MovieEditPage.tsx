import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { moviesApi } from '@/api/movies'
import { MovieForm } from '@/components/movie-form'

export function MovieEditPage() {
  const { id } = useParams<{ id: string }>()
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movies', id],
    queryFn: () => moviesApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-xl" />
  if (!movie) return <div className="text-center py-12 text-muted-foreground">Movie not found</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit Movie</h1>
      <MovieForm movie={movie} />
    </div>
  )
}
