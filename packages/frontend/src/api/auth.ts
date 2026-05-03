import type { AuthResponse, User } from '@movie/shared'
import { ApiError, request } from './client'

interface SignupInput {
  email: string
  username: string
  password: string
  name?: string
}

interface LoginInput {
  identifier: string
  password: string
}

export const authApi = {
  signup: (data: SignupInput) =>
    request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

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
