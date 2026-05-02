import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { moviesApi } from '@/api/movies'
import type { Movie, MovieFormData } from '@movie/shared'

export function MovieForm({ movie }: { movie?: Movie }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!movie

  const mutation = useMutation({
    mutationFn: (data: MovieFormData) =>
      isEditing ? moviesApi.update(movie.id, data) : moviesApi.create(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] })
      navigate(`/movies/${saved.id}`)
    },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const genresRaw = fd.get('genres') as string
    mutation.mutate({
      title: fd.get('title') as string,
      imdbId: (fd.get('imdbId') as string) || undefined,
      year: fd.get('year') ? Number(fd.get('year')) : undefined,
      type: (fd.get('type') as string) || undefined,
      rating: fd.get('rating') ? Number(fd.get('rating')) : undefined,
      votes: fd.get('votes') ? Number(fd.get('votes')) : undefined,
      genres: genresRaw ? genresRaw.split(',').map((g) => g.trim()).filter(Boolean) : [],
      runtime: (fd.get('runtime') as string) || undefined,
      certificate: (fd.get('certificate') as string) || undefined,
      description: (fd.get('description') as string) || undefined,
      posterUrl: (fd.get('posterUrl') as string) || undefined,
    })
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader><CardTitle>{isEditing ? 'Edit Movie' : 'Add New Movie'}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required defaultValue={movie?.title ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" name="year" type="number" defaultValue={movie?.year ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input id="type" name="type" placeholder="feature, tv_series..." defaultValue={movie?.type ?? ''} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rating">Rating</Label>
              <Input id="rating" name="rating" type="number" step="0.1" min="0" max="10" defaultValue={movie?.rating ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="votes">Votes</Label>
              <Input id="votes" name="votes" type="number" defaultValue={movie?.votes ?? ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="genres">Genres (comma separated)</Label>
            <Input id="genres" name="genres" placeholder="Action, Drama, Sci-Fi" defaultValue={movie?.genres.join(', ') ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="runtime">Runtime</Label>
              <Input id="runtime" name="runtime" placeholder="2h 30m" defaultValue={movie?.runtime ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate">Certificate</Label>
              <Input id="certificate" name="certificate" placeholder="PG-13, R..." defaultValue={movie?.certificate ?? ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="imdbId">IMDB ID</Label>
            <Input id="imdbId" name="imdbId" placeholder="tt1234567" defaultValue={movie?.imdbId ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="posterUrl">Poster URL</Label>
            <Input id="posterUrl" name="posterUrl" placeholder="https://..." defaultValue={movie?.posterUrl ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} defaultValue={movie?.description ?? ''} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Movie')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
