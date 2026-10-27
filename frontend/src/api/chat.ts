import type { Lang, StringKey } from '../i18n/strings'
import { API_V1, ApiError, apiRequest } from './client'
import type { SafetyResult } from './safety'
import type { Message } from './types'

export interface ChatRequest {
  message: string
  language: Lang
  conversation_id?: string
}

export interface ChatResponse {
  conversation_id: string
  language: Lang
  title: string
  user_message: Message
  assistant_message: Message
  /** Result of the deterministic safety rules for the user's message (null when nothing matched). */
  emergency: SafetyResult | null
}

export const MAX_MESSAGE_CHARS = 2000

export const sendChat = (data: ChatRequest, signal?: AbortSignal) =>
  apiRequest<ChatResponse>(`${API_V1}/chat`, { method: 'POST', body: JSON.stringify(data), signal })

/** Errors that a plain retry cannot fix (configuration or conversation length). */
export const NON_RETRYABLE: ReadonlySet<StringKey> = new Set<StringKey>([
  'chat.errorNotConfigured',
  'chat.errorModelUnavailable',
  'chat.errorInvalid',
  'chat.errorTooLong',
])

/** Translated message for a failed chat request. Raw server text is never shown. */
export function chatErrorKey(err: unknown): StringKey {
  if (!(err instanceof ApiError)) return 'common.error'
  if (err.status === 0) return 'auth.errorNetwork'
  if (err.status === 429 && err.message === 'ai_rate_limited') return 'chat.errorAiQuota'
  if (err.status === 429) return 'chat.errorRateLimited'
  if (err.status === 413) return 'chat.errorTooLong'
  if (err.status === 504) return 'chat.errorTimeout'
  if (err.status === 503 && err.message === 'ai_not_configured') return 'chat.errorNotConfigured'
  if (err.status === 503 && err.message === 'ai_model_unavailable') return 'chat.errorModelUnavailable'
  if (err.status === 503 || err.status === 502) return 'chat.errorUnavailable'
  if (err.status === 404) return 'chat.errorNotFound'
  if (err.status === 422) return 'chat.errorInvalid'
  return 'common.error'
}
