import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Bookmark, Eye, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import type { PeopleRole, PersonSearchResult } from '@movie/shared'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { moviesApi } from '@/api/movies'
import { peopleApi } from '@/api/people'

const ROLE_LABEL: Record<PeopleRole, string> = {
  any: 'Any role',
  director: 'Director',
  writer: 'Writer',
  producer: 'Producer',
  cast: 'Cast',
}

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

export function MovieSortControl({ className }: { className?: string }) {
  const { searchParams, update } = useFilterUpdate()
  const sortBy = searchParams.get('sortBy') ?? 'year'
  const sortOrder = searchParams.get('sortOrder') ?? 'desc'
  return (
    <div className={cn('flex items-center', className)}>
      <Select value={sortBy} onValueChange={(v) => update({ sortBy: v })}>
        <SelectTrigger size="sm" className="data-[size=sm]:h-10 sm:data-[size=sm]:h-8 w-[120px] sm:w-[140px] rounded-r-none border-r-0">
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
        className="h-10 sm:h-8 rounded-l-none px-2"
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
        'inline-flex h-10 sm:h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors',
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
  const selectedPeople = (searchParams.get('people') ?? '').split(',').map((p) => p.trim()).filter(Boolean)
  const peopleRole = (searchParams.get('peopleRole') ?? 'any') as PeopleRole
  const type = searchParams.get('type') ?? ''
  const minYear = searchParams.get('minYear') ?? ''
  const maxYear = searchParams.get('maxYear') ?? ''
  const minRating = searchParams.get('minRating') ?? ''
  const maxRating = searchParams.get('maxRating') ?? ''
  const minVotes = searchParams.get('minVotes') ?? ''
  const maxVotes = searchParams.get('maxVotes') ?? ''
  const watchlist = searchParams.get('watchlist') ?? ''

  const { data: peopleInfo = [] } = useQuery({
    queryKey: ['people-lookup', selectedPeople.join(',')],
    queryFn: () => peopleApi.lookup(selectedPeople),
    enabled: selectedPeople.length > 0,
    staleTime: 60_000,
  })
  const peopleName = (id: string) => peopleInfo.find((p) => p.id === id)?.name ?? id

  const removePerson = (id: string) => {
    const remaining = selectedPeople.filter((p) => p !== id)
    update({ people: remaining.join(',') || null, peopleRole: remaining.length ? null : null })
  }

  const removeGenre = (g: string) => {
    const remaining = selectedGenres.filter((x) => x !== g)
    update({ genres: remaining.join(',') || null })
  }

  const chips: Chip[] = []

  if (search) chips.push({ key: 'search', label: `Search: ${search}`, onRemove: () => update({ search: null }) })
  for (const g of selectedGenres) {
    chips.push({ key: `genre:${g}`, label: g, onRemove: () => removeGenre(g) })
  }
  for (const id of selectedPeople) {
    const name = peopleName(id)
    const suffix = peopleRole !== 'any' ? ` (${ROLE_LABEL[peopleRole]})` : ''
    chips.push({ key: `person:${id}`, label: `${name}${suffix}`, onRemove: () => removePerson(id) })
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
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/60 bg-secondary/60 pl-2.5 pr-1 py-0.5 text-xs">
      <span className="max-w-[180px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-full p-1 sm:p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

export function LibraryToggles() {
  const { searchParams, update } = useFilterUpdate()
  const watchlistOn = searchParams.get('watchlist') === 'true'
  // Watched movies are hidden by default; this toggle reveals only watched movies.
  const watchedOn = searchParams.get('watched') === 'true'
  return (
    <>
      <ToggleButton
        active={watchlistOn}
        onClick={() => update({ watchlist: watchlistOn ? null : 'true' })}
        icon={<Bookmark className="h-3.5 w-3.5" />}
        label="Watchlist"
        title={watchlistOn ? 'Showing only watchlist · click to clear' : 'Show only watchlist'}
      />
      <ToggleButton
        active={watchedOn}
        onClick={() => update({ watched: watchedOn ? null : 'true' })}
        icon={<Eye className="h-3.5 w-3.5" />}
        label="Watched"
        title={watchedOn ? 'Showing watched movies · click to hide them' : 'Watched movies hidden · click to show them'}
      />
    </>
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
  const selectedPeople = (searchParams.get('people') ?? '').split(',').map((p) => p.trim()).filter(Boolean)
  const peopleRole = (searchParams.get('peopleRole') ?? 'any') as PeopleRole
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

      <div className="lg:hidden">
        <Section label="Library">
          <div className="flex flex-wrap gap-2">
            <LibraryToggles />
          </div>
        </Section>
      </div>

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

      <Section
        label={`People${selectedPeople.length ? ` · ${selectedPeople.length}` : ''}`}
        hint="Movies must include all selected people."
      >
        <PeoplePicker
          selectedIds={selectedPeople}
          role={peopleRole}
          onAdd={(id) => {
            if (selectedPeople.includes(id)) return
            update({ people: [...selectedPeople, id].join(',') })
          }}
          onRemove={(id) => {
            const remaining = selectedPeople.filter((p) => p !== id)
            update({ people: remaining.join(',') || null, peopleRole: remaining.length ? null : null })
          }}
          onRoleChange={(role) => {
            if (selectedPeople.length === 0) return
            update({ peopleRole: role === 'any' ? null : role })
          }}
        />
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
      <Label className="text-xs sm:text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs sm:text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function PillToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent text-foreground border-border hover:bg-muted',
      )}
    >
      {label}
    </button>
  )
}

function PeoplePicker({
  selectedIds,
  role,
  onAdd,
  onRemove,
  onRoleChange,
}: {
  selectedIds: string[]
  role: PeopleRole
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onRoleChange: (role: PeopleRole) => void
}) {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 250)
    return () => clearTimeout(id)
  }, [q])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['people-search', debouncedQ],
    queryFn: () => peopleApi.search(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  })

  const { data: selectedInfo = [] } = useQuery({
    queryKey: ['people-lookup', selectedIds.join(',')],
    queryFn: () => peopleApi.lookup(selectedIds),
    enabled: selectedIds.length > 0,
    staleTime: 60_000,
  })

  const filtered = useMemo<PersonSearchResult[]>(
    () => results.filter((r) => !selectedIds.includes(r.id)),
    [results, selectedIds],
  )

  const showPopover = open && debouncedQ.length >= 2

  return (
    <div className="space-y-2">
      <Popover open={showPopover} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Users className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search a person…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              className="h-9 sm:h-8 pl-7 pr-7 text-sm"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 sm:p-0.5 hover:bg-muted"
                aria-label="Clear"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[var(--radix-popover-trigger-width)] p-0 max-h-64 overflow-y-auto scrollbar-minimal"
        >
          {isFetching && filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          )}
          {!isFetching && filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
          )}
          {filtered.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onAdd(p.id)
                setQ('')
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="truncate">{p.name}</div>
                {p.professions.length > 0 && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {p.professions.slice(0, 3).join(', ')}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{p.credits}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const name = selectedInfo.find((p) => p.id === id)?.name ?? id
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 pl-2.5 pr-1 py-0.5 text-xs"
              >
                <span className="max-w-[140px] truncate">{name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <Select value={role} onValueChange={(v) => onRoleChange(v as PeopleRole)}>
          <SelectTrigger size="sm" className="data-[size=sm]:h-10 sm:data-[size=sm]:h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any role</SelectItem>
            <SelectItem value="director">Director</SelectItem>
            <SelectItem value="writer">Writer</SelectItem>
            <SelectItem value="producer">Producer</SelectItem>
            <SelectItem value="cast">Cast</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        type="number"
        inputMode="numeric"
        step={step}
        min={min}
        max={max}
        placeholder={minPlaceholder}
        value={localMin}
        onChange={(e) => setLocalMin(e.target.value)}
        className="h-9 sm:h-8 w-full"
      />
      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">to</span>
      <Input
        type="number"
        inputMode="numeric"
        step={step}
        min={min}
        max={max}
        placeholder={maxPlaceholder}
        value={localMax}
        onChange={(e) => setLocalMax(e.target.value)}
        className="h-9 sm:h-8 w-full"
      />
    </div>
  )
}

const FILTER_PARAM_KEYS = [
  'search',
  'genres',
  'people',
  'peopleRole',
  'type',
  'minRating',
  'maxRating',
  'minYear',
  'maxYear',
  'minVotes',
  'maxVotes',
  'watchlist',
  'watched',
]

function countActiveFilters(searchParams: URLSearchParams): number {
  let n = 0
  for (const key of FILTER_PARAM_KEYS) {
    const v = searchParams.get(key)
    if (!v) continue
    if (key === 'genres' || key === 'people') {
      n += v.split(',').map((s) => s.trim()).filter(Boolean).length
    } else if (key === 'peopleRole') {
      // role only counts when 'people' has values; skip standalone.
      continue
    } else {
      n += 1
    }
  }
  return n
}

export function MobileFiltersSheet({ genres }: { genres: string[] }) {
  const [open, setOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const activeCount = countActiveFilters(searchParams)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 sm:h-8 lg:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-none sm:w-[85vw] sm:max-w-sm p-0">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-minimal px-4 py-4">
          <MovieFiltersSidebar genres={genres} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
