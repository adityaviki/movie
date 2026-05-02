import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function MovieFilters({ genres }: { genres: string[] }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const update = useCallback((key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value && value !== 'all') next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }, [setSearchParams])

  const hasFilters = searchParams.toString().length > 0

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Search movies..."
        defaultValue={searchParams.get('search') ?? ''}
        onKeyDown={(e) => { if (e.key === 'Enter') update('search', e.currentTarget.value || null) }}
        className="w-[180px]"
      />
      <Select value={searchParams.get('genre') ?? 'all'} onValueChange={(v) => update('genre', v)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Genre" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Genres</SelectItem>
          {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={searchParams.get('sortBy') ?? 'createdAt'} onValueChange={(v) => update('sortBy', v)}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">Date Added</SelectItem>
          <SelectItem value="title">Title</SelectItem>
          <SelectItem value="rating">Rating</SelectItem>
          <SelectItem value="year">Year</SelectItem>
        </SelectContent>
      </Select>
      <Select value={searchParams.get('sortOrder') ?? 'asc'} onValueChange={(v) => update('sortOrder', v)}>
        <SelectTrigger className="w-[110px]"><SelectValue placeholder="Order" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">Descending</SelectItem>
          <SelectItem value="asc">Ascending</SelectItem>
        </SelectContent>
      </Select>
      <Select value={searchParams.get('watchlist') ?? 'all'} onValueChange={(v) => update('watchlist', v)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Watchlist" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Movies</SelectItem>
          <SelectItem value="true">In Watchlist</SelectItem>
          <SelectItem value="false">Not in Watchlist</SelectItem>
        </SelectContent>
      </Select>
      <Select value={searchParams.get('watched') ?? 'all'} onValueChange={(v) => update('watched', v)}>
        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Watched" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="true">Watched</SelectItem>
          <SelectItem value="false">Unwatched</SelectItem>
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
          <X className="mr-1 h-4 w-4" />Clear
        </Button>
      )}
    </div>
  )
}
