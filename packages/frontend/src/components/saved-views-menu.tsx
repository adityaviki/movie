import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Check, Pencil, RefreshCw, Star, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { savedViewsApi } from '@/api/saved-views'
import { cn } from '@/lib/utils'
import type { SavedView } from '@movie/shared'

export function currentParamsString(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams)
  next.delete('page')
  next.delete('movie')
  const sorted = [...next.entries()].sort(([a], [b]) => a.localeCompare(b))
  const out = new URLSearchParams()
  for (const [k, v] of sorted) out.append(k, v)
  return out.toString()
}

export function SavedViewsMenu() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const { data } = useQuery({
    queryKey: ['saved-views'],
    queryFn: savedViewsApi.list,
    staleTime: 60_000,
  })
  const views = data?.views ?? []
  const defaultView = data?.defaultView ?? null

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['saved-views'] })

  const createMutation = useMutation({
    mutationFn: savedViewsApi.create,
    onSuccess: () => {
      invalidate()
      setNewName('')
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; params?: string }) =>
      savedViewsApi.update(id, patch),
    onSuccess: () => {
      invalidate()
      setRenamingId(null)
    },
  })
  const removeMutation = useMutation({
    mutationFn: savedViewsApi.remove,
    onSuccess: invalidate,
  })
  const setDefaultMutation = useMutation({
    mutationFn: savedViewsApi.setDefault,
    onSuccess: invalidate,
  })

  const currentString = currentParamsString(searchParams)
  const matchedSaved = views.find((v) => normalize(v.params) === currentString)
  const matchedName = matchedSaved?.name
  const defaultName = useMemo(() => nextDefaultName(views), [views])

  useEffect(() => {
    if (open) setNewName((prev) => prev || defaultName)
  }, [open, defaultName])

  function applyParams(params: string) {
    setSearchParams(new URLSearchParams(params))
    setOpen(false)
  }

  function toggleDefault(key: string) {
    setDefaultMutation.mutate(defaultView === key ? null : key)
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    createMutation.mutate({ name, params: currentString })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Bookmark className="mr-1.5 h-3.5 w-3.5" />
          Views
          {matchedName && (
            <span className="ml-1.5 text-xs text-muted-foreground">· {matchedName}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Views</div>
        </div>
        <Separator />
        <div className="max-h-72 overflow-y-auto py-1">
          {views.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No saved views yet.</div>
          )}
          {views.map((view) => {
            const isActive = normalize(view.params) === currentString
            const isDefault = defaultView === view.id
            const isRenaming = renamingId === view.id
            return (
              <div
                key={view.id}
                className={cn(
                  'group flex items-center gap-1 px-2 py-1.5 text-sm',
                  isActive && 'bg-secondary/60',
                )}
              >
                <button
                  type="button"
                  title={isDefault ? 'Unset default' : 'Set as default'}
                  className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleDefault(view.id)}
                >
                  <Star className={cn('h-3.5 w-3.5', isDefault && 'fill-yellow-400 text-yellow-400')} />
                </button>

                {isRenaming ? (
                  <form
                    className="flex flex-1 items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const name = renameValue.trim()
                      if (!name) return
                      updateMutation.mutate({ id: view.id, name })
                    }}
                  >
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-7 text-sm"
                    />
                    <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setRenamingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex-1 truncate text-left hover:text-primary"
                      title="Apply view"
                      onClick={() => applyParams(view.params)}
                    >
                      {view.name}
                    </button>
                    <button
                      type="button"
                      title="Update view to current filters"
                      disabled={isActive}
                      className="shrink-0 p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                      onClick={() => updateMutation.mutate({ id: view.id, params: currentString })}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Rename"
                      className="shrink-0 p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                      onClick={() => {
                        setRenamingId(view.id)
                        setRenameValue(view.name)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      className="shrink-0 p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                      onClick={() => {
                        if (confirm(`Delete "${view.name}"?`)) removeMutation.mutate(view.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <Separator />
        <div className="px-3 py-2.5">
          {matchedName ? (
            <p className="text-xs text-muted-foreground">
              Current filters match <span className="font-medium text-foreground">{matchedName}</span>.
            </p>
          ) : currentString === '' ? (
            <p className="text-xs text-muted-foreground">Apply some filters to save a view.</p>
          ) : (
            <form onSubmit={handleSave} className="flex items-center gap-2">
              <Input
                autoFocus
                placeholder="View name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" disabled={!newName.trim() || createMutation.isPending}>
                Save
              </Button>
            </form>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function nextDefaultName(views: SavedView[]): string {
  const pattern = /^View (\d+)$/
  let max = 0
  for (const v of views) {
    const m = v.name.match(pattern)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `View ${max + 1}`
}

function normalize(params: string): string {
  const p = new URLSearchParams(params)
  p.delete('page')
  const sorted = [...p.entries()].sort(([a], [b]) => a.localeCompare(b))
  const out = new URLSearchParams()
  for (const [k, v] of sorted) out.append(k, v)
  return out.toString()
}
