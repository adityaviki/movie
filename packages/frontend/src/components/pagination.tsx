import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const [, setSearchParams] = useSearchParams()
  const totalPages = Math.ceil(total / pageSize)

  const go = (p: number) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('page', String(p)); return next })

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-2 text-sm">
      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => go(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-muted-foreground">{page} / {totalPages}</span>
      <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => go(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
