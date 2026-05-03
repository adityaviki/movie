import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'

export function RequireAuth() {
  const location = useLocation()
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: Infinity,
  })

  if (isLoading) return null
  if (!data) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
