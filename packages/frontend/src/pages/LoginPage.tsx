import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/api/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/movies'

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      queryClient.setQueryData(['auth', 'me'], res.user)
      navigate(from, { replace: true })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      identifier: (fd.get('identifier') as string).trim(),
      password: fd.get('password') as string,
    })
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Log in</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or username</Label>
              <Input id="identifier" name="identifier" autoComplete="username" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Logging in...' : 'Log in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
