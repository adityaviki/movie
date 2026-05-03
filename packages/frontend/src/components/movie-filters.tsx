import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Bookmark, Eye, Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { moviesApi } from '@/api/movies'

const TYPE_LABEL: Record<string, string> = {
  feature: 'Feature',
  tv_series: 'TV Series',
  tvMiniSeries: 'TV Mini Series',
  tvMovie: 'TV Movie',
  tvSpecial: 'TV Special',
  video: 'Video',
}

function useFilterUpdate() {
  const [searchParams, setSearchParams] = useSearchParams()
  const update = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value && value !== 'all') next.set(key, value)
          else next.delete(key)
        }
        next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )
  return { searchParams, setSearchParams, update }
}

export function MovieSearchBox({ className }: { className?: string }) {
  const { searchParams, update } = useFilterUpdate()
  const search = searchParams.get('search') ?? ''
  return (
    <div className={cn('w-full', className)}>
      <DebouncedSearch value={search} onCommit={(v) => update({ search: v || null })} />
    </div>
  )
}

export function MovieSortControl() {
  const { searchParams, update } = useFilterUpdate()
  const sortBy = searchParams.get('sortBy') ?? 'createdAt'
  const sortOrder = searchParams.get('sortOrder') ?? 'desc'
  return (
    <div className="flex items-center">
      <Select value={sortBy} onValueChange={(v) => update({ sortBy: v })}>
        <SelectTrigger size="sm" className="w-[140px] rounded-r-none border-r-0">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">Date Added</SelectItem>
          <SelectItem value="title">Title</SelectItem>
          <SelectItem value="rating">Rating</SelectItem>
          <SelectItem value="votes">Popularity</SelectItem>
          <SelectItem value="year">Year</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="h-8 rounded-l-none px-2"
        aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
        onClick={() => update({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })}
      >
        {sortOrder === 'asc' ? (
          <ArrowUpNarrowWide className="h-4 w-4" />
        ) : (
          <ArrowDownNarrowWide className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

export function MovieFiltersTopbar() {
  const { searchParams, setSearchParams } = useFilterUpdate()
  const watchlistOn = searchParams.get('watchlist') === 'true'
  const watchedOn = searchParams.get('watched') === 'true'

  const toggleParam = (key: string, onValue: string, currentlyOn: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (currentlyOn) next.delete(key)
      else next.set(key, onValue)
      next.delete('page')
      return next
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleButton
        active={watchlistOn}
        onClick={() => toggleParam('watchlist', 'true', watchlistOn)}
        icon={<Bookmark className="h-3.5 w-3.5" />}
        label="Watchlist"
        title={watchlistOn ? 'Showing only watchlist · click to clear' : 'Show only watchlist'}
      />
      <ToggleButton
        active={watchedOn}
        onClick={() => toggleParam('watched', 'true', watchedOn)}
        icon={<Eye className="h-3.5 w-3.5" />}
        label="Watched"
        title={watchedOn ? 'Showing only watched · click to clear' : 'Show only watched'}
      />
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  title,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent border-input hover:bg-accent hover:text-accent-foreground',
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  )
}

type Chip = { key: string; label: string; onRemove: () => void }

export function ActiveFilters() {
  const { searchParams, setSearchParams, update } = useFilterUpdate()

  const search = searchParams.get('search') ?? ''
  const selectedGenres = (searchParams.get('genres') ?? '').split(',').map((g) => g.trim()).filter(Boolean)
  const type = searchParams.get('type') ?? ''
  const minYear = searchParams.get('minYear') ?? ''
  const maxYear = searchParams.get('maxYear') ?? ''
  const minRating = searchParams.get('minRating') ?? ''
  const maxRating = searchParams.get('maxRating') ?? ''
  const minVotes = searchParams.get('minVotes') ?? ''
  const maxVotes = searchParams.get('maxVotes') ?? ''
  const watchlist = searchParams.get('watchlist') ?? ''
  const watched = searchParams.get('watched') ?? ''

  const removeGenre = (g: string) => {
    const remaining = selectedGenres.filter((x) => x !== g)
    update({ genres: remaining.join(',') || null })
  }

  const chips: Chip[] = []

  if (search) chips.push({ key: 'search', label: `Search: ${search}`, onRemove: () => update({ search: null }) })
  for (const g of selectedGenres) {
    chips.push({ key: `genre:${g}`, label: g, onRemove: () => removeGenre(g) })
  }
  if (type) {
    chips.push({ key: 'type', label: `Type: ${TYPE_LABEL[type] ?? type}`, onRemove: () => update({ type: null }) })
  }
  if (minYear || maxYear) {
    chips.push({
      key: 'year',
      label: `Year: ${minYear || '*'}–${maxYear || '*'}`,
      onRemove: () => update({ minYear: null, maxYear: null }),
    })
  }
  if (minRating || maxRating) {
    chips.push({
      key: 'rating',
      label: `Rating: ${minRating || '*'}–${maxRating || '*'}`,
      onRemove: () => update({ minRating: null, maxRating: null }),
    })
  }
  if (minVotes || maxVotes) {
    chips.push({
      key: 'votes',
      label: `Votes: ${minVotes || '*'}–${maxVotes || '*'}`,
      onRemove: () => update({ minVotes: null, maxVotes: null }),
    })
  }
  if (watchlist === 'false') {
    chips.push({
      key: 'watchlist',
      label: 'Not in Watchlist',
      onRemove: () => update({ watchlist: null }),
    })
  }
  if (watched === 'all') {
    chips.push({
      key: 'watched',
      label: 'Watched: All',
      onRemove: () => update({ watched: null }),
    })
  }

  if (chips.length === 0) return null

  const clearAll = () => {
    const next = new URLSearchParams()
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder')
    if (sortBy) next.set('sortBy', sortBy)
    if (sortOrder) next.set('sortOrder', sortOrder)
    setSearchParams(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Filters</span>
      {chips.map((c) => (
        <FilterChip key={c.key} label={c.label} onRemove={c.onRemove} />
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground"
        onClick={clearAll}
      >
        Clear all
      </Button>
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 pl-2.5 pr-1 py-0.5 text-xs">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

export function MovieFiltersSidebar({ genres }: { genres: string[] }) {
  const { searchParams, setSearchParams, update } = useFilterUpdate()

  const { data: types = [] } = useQuery({
    queryKey: ['movie-types'],
    queryFn: moviesApi.types,
    staleTime: Infinity,
  })

  const selectedGenres = (searchParams.get('genres') ?? '').split(',').map((g) => g.trim()).filter(Boolean)
  const selectedType = searchParams.get('type') ?? ''
  const minYear = searchParams.get('minYear') ?? ''
  const maxYear = searchParams.get('maxYear') ?? ''
  const minRating = searchParams.get('minRating') ?? ''
  const maxRating = searchParams.get('maxRating') ?? ''
  const minVotes = searchParams.get('minVotes') ?? ''
  const maxVotes = searchParams.get('maxVotes') ?? ''

  const anyActive = searchParams.toString().length > 0

  const toggleGenre = (g: string) => {
    const set = new Set(selectedGenres)
    if (set.has(g)) set.delete(g)
    else set.add(g)
    update({ genres: Array.from(set).join(',') || null })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        {anyActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setSearchParams({})}
          >
            Clear all
          </Button>
        )}
      </div>

      <Separator />

      <Section label="Rating">
        <RangeInputs
          minValue={minRating}
          maxValue={maxRating}
          minPlaceholder="0.0"
          maxPlaceholder="10.0"
          step="0.1"
          min={0}
          max={10}
          onCommit={(min, max) => update({ minRating: min, maxRating: max })}
        />
      </Section>

      <Section label="Year">
        <RangeInputs
          minValue={minYear}
          maxValue={maxYear}
          minPlaceholder="from"
          maxPlaceholder="to"
          onCommit={(min, max) => update({ minYear: min, maxYear: max })}
        />
      </Section>

      <Section label="Votes">
        <RangeInputs
          minValue={minVotes}
          maxValue={maxVotes}
          minPlaceholder="min"
          maxPlaceholder="max"
          onCommit={(min, max) => update({ minVotes: min, maxVotes: max })}
        />
      </Section>

      <Section
        label={`Genres${selectedGenres.length ? ` · ${selectedGenres.length}` : ''}`}
        hint="Movies must include all selected genres."
      >
        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <PillToggle
              key={g}
              active={selectedGenres.includes(g)}
              onClick={() => toggleGenre(g)}
              label={g}
            />
          ))}
        </div>
      </Section>

      <Section label="Type">
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <PillToggle
              key={t.type}
              active={selectedType === t.type}
              onClick={() => update({ type: selectedType === t.type ? null : t.type })}
              label={`${TYPE_LABEL[t.type] ?? t.type} · ${t.count.toLocaleString()}`}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function PillToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-full text-xs border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent text-foreground border-border hover:bg-muted',
      )}
    >
      {label}
    </button>
  )
}

function DebouncedSearch({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value)
  const lastCommitted = useRef(value)

  useEffect(() => {
    if (value !== lastCommitted.current) {
      setLocal(value)
      lastCommitted.current = value
    }
  }, [value])

  useEffect(() => {
    if (local === lastCommitted.current) return
    const id = setTimeout(() => {
      lastCommitted.current = local
      onCommit(local)
    }, 300)
    return () => clearTimeout(id)
  }, [local, onCommit])

  return (
    <div className="relative w-full">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Search title or description..."
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="h-9 pl-8 pr-7"
      />
      {local && (
        <button
          type="button"
          onClick={() => setLocal('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

function RangeInputs({
  minValue,
  maxValue,
  minPlaceholder,
  maxPlaceholder,
  step,
  min,
  max,
  onCommit,
}: {
  minValue: string
  maxValue: string
  minPlaceholder?: string
  maxPlaceholder?: string
  step?: string
  min?: number
  max?: number
  onCommit: (min: string | null, max: string | null) => void
}) {
  const [localMin, setLocalMin] = useState(minValue)
  const [localMax, setLocalMax] = useState(maxValue)
  const lastCommittedMin = useRef(minValue)
  const lastCommittedMax = useRef(maxValue)

  useEffect(() => {
    if (minValue !== lastCommittedMin.current) {
      setLocalMin(minValue)
      lastCommittedMin.current = minValue
    }
  }, [minValue])

  useEffect(() => {
    if (maxValue !== lastCommittedMax.current) {
      setLocalMax(maxValue)
      lastCommittedMax.current = maxValue
    }
  }, [maxValue])

  useEffect(() => {
    if (localMin === lastCommittedMin.current && localMax === lastCommittedMax.current) return
    const id = setTimeout(() => {
      lastCommittedMin.current = localMin
      lastCommittedMax.current = localMax
      onCommit(localMin || null, localMax || null)
    }, 400)
    return () => clearTimeout(id)
  }, [localMin, localMax, onCommit])

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        step={step}
        min={min}
        max={max}
        placeholder={minPlaceholder}
        value={localMin}
        onChange={(e) => setLocalMin(e.target.value)}
        className="h-8 w-full"
      />
      <span className="text-xs text-muted-foreground shrink-0">to</span>
      <Input
        type="number"
        inputMode="numeric"
        step={step}
        min={min}
        max={max}
        placeholder={maxPlaceholder}
        value={localMax}
        onChange={(e) => setLocalMax(e.target.value)}
        className="h-8 w-full"
      />
    </div>
  )
}
