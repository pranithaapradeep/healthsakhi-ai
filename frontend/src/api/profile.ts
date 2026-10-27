import type { Lang } from '../i18n/strings'
import { API_V1, apiRequest } from './client'
import type { User } from './types'

export interface ProfileUpdate {
  display_name?: string
  preferred_language?: Lang
  voice_autoplay?: boolean
}

export const getProfile = () => apiRequest<User>(`${API_V1}/profile`)

export const updateProfile = (data: ProfileUpdate) =>
  apiRequest<User>(`${API_V1}/profile`, { method: 'PATCH', body: JSON.stringify(data) })

/** Permanently deletes the account and all its data. Requires the current password. */
export const deleteAccount = (password: string) =>
  apiRequest<void>(`${API_V1}/profile`, { method: 'DELETE', body: JSON.stringify({ password }) })
