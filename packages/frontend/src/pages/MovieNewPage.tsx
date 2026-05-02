import { MovieForm } from '@/components/movie-form'

export function MovieNewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Add Movie</h1>
      <MovieForm />
    </div>
  )
}
