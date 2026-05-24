import type { AuthResponse, User } from '@movie/shared'
import { ApiError, request } from './client'

interface LoginInput {
  identifier: string
  password: string
}

export const authApi = {
  login: (data: LoginInput) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  async me(): Promise<User | null> {
    try {
      const res = await request<AuthResponse>('/api/auth/me')
      return res.user
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null
      throw err
    }
  },
}
