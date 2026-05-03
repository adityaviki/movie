import type { SavedView, SavedViewInput, SavedViewsResponse } from '@movie/shared'
import { request } from './client'

export const savedViewsApi = {
  list: () => request<SavedViewsResponse>('/api/saved-views'),

  create: (data: SavedViewInput) =>
    request<SavedView>('/api/saved-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<SavedViewInput>) =>
    request<SavedView>(`/api/saved-views/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<void>(`/api/saved-views/${id}`, { method: 'DELETE' }),

  setDefault: (key: string | null) =>
    request<void>('/api/saved-views/default', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    }),
}
