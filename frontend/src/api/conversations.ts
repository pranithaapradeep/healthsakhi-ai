import { API_V1, apiRequest } from './client'
import type { ConversationDetail, ConversationSummary } from './types'

export const listConversations = (limit = 20, signal?: AbortSignal) =>
  apiRequest<ConversationSummary[]>(`${API_V1}/conversations?limit=${limit}`, { signal })

export const getConversation = (id: string) => apiRequest<ConversationDetail>(`${API_V1}/conversations/${encodeURIComponent(id)}`)

export const deleteConversation = (id: string) =>
  apiRequest<void>(`${API_V1}/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
