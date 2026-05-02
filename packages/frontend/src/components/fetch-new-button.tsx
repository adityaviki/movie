import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function FetchNewButton() {
  const [fetching, setFetching] = useState(false)
  const [status, setStatus] = useState('')
  const queryClient = useQueryClient()

  async function handleClick() {
    setFetching(true)
    setStatus('Starting...')
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      if (!res.ok || !res.body) { setStatus('Failed'); setFetching(false); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const msg = JSON.parse(line)
          if (msg.type === 'progress') setStatus(msg.yearNew > 0 ? `${msg.year}: +${msg.yearNew} new` : `${msg.year}: no new`)
          else if (msg.type === 'done') setStatus(msg.totalNew > 0 ? `Done! +${msg.totalNew} movies` : 'Done! No new movies')
        }
      }
      queryClient.invalidateQueries({ queryKey: ['movies'] })
      setTimeout(() => setStatus(''), 5000)
    } catch {
      setStatus('Error')
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status && <span className="text-sm text-muted-foreground">{status}</span>}
      <Button variant="outline" onClick={handleClick} disabled={fetching}>
        <RefreshCw className={`mr-2 h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
        Fetch New
      </Button>
    </div>
  )
}
