import type { Lang } from '../i18n/strings'
import { API_V1, ApiError, apiRequest } from './client'
import type { User } from './types'

export interface RegisterInput {
  display_name: string
  email: string
  password: string
  preferred_language: Lang
}

export const register = (data: RegisterInput) =>
  apiRequest<User>(`${API_V1}/auth/register`, { method: 'POST', body: JSON.stringify(data) })

export const login = (email: string, password: string) =>
  apiRequest<User>(`${API_V1}/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) })

export const logout = () => apiRequest<void>(`${API_V1}/auth/logout`, { method: 'POST' })

/** Returns the signed-in user, or null for guests. */
export async function fetchMe(signal?: AbortSignal): Promise<User | null> {
  try {
    return await apiRequest<User>(`${API_V1}/auth/me`, { signal })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 0)) return null
    throw err
  }
}
