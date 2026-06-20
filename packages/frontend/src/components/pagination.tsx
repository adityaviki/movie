import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const [, setSearchParams] = useSearchParams()
  const totalPages = Math.ceil(total / pageSize)

  const go = (p: number) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('page', String(p)); return next })

  if (totalPages <= 1) return null

  const atStart = page <= 1
  const atEnd = page >= totalPages

  return (
    <div className="flex w-full sm:w-auto items-center justify-between sm:justify-center gap-2 sm:gap-3 text-sm">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:h-9 sm:w-9"
        disabled={atStart}
        aria-label="First page"
        onClick={() => go(1)}
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:h-9 sm:w-9"
        disabled={atStart}
        aria-label="Previous page"
        onClick={() => go(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-muted-foreground whitespace-nowrap">{page} / {totalPages}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:h-9 sm:w-9"
        disabled={atEnd}
        aria-label="Next page"
        onClick={() => go(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:h-9 sm:w-9"
        disabled={atEnd}
        aria-label="Last page"
        onClick={() => go(totalPages)}
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
