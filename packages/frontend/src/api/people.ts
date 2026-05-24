import type { PersonSearchResult } from '@movie/shared'
import { request } from './client'

export const peopleApi = {
  search: (q: string) =>
    request<PersonSearchResult[]>(`/api/people/search?q=${encodeURIComponent(q)}`),
  lookup: (ids: string[]) =>
    request<{ id: string; name: string; professions: string[] }[]>(
      `/api/people/lookup?ids=${encodeURIComponent(ids.join(','))}`,
    ),
}
