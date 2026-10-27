import type { Lang, StringKey } from '../i18n/strings'
import { API_V1, apiRequest } from './client'

export type SafetyLevel = 'emergency' | 'urgent' | 'none'

export interface SafetyResult {
  level: SafetyLevel
  categories: string[]
  rule_ids: string[]
}

/** Emergency red flags a person can tick (mirrors backend app/safety/rules.py RED_FLAG_CATEGORIES). */
export const RED_FLAGS = [
  'stroke',
  'breathing',
  'chest_pain',
  'unconscious',
  'bleeding',
  'seizure',
  'anaphylaxis',
  'self_harm',
  'poisoning',
  'severe_headache',
] as const
export type RedFlag = (typeof RED_FLAGS)[number]

const URGENT_REASONS = [
  'severe_or_worsening',
  'infant',
  'pregnancy_warning',
  'blood_in_stool_urine',
  'severe_abdominal_pain',
  'dehydration',
] as const

/** Translation key for a safety category, or null if unknown. */
export function categoryLabelKey(category: string): StringKey | null {
  if ((RED_FLAGS as readonly string[]).includes(category)) return `flag.${category as RedFlag}`
  if ((URGENT_REASONS as readonly string[]).includes(category)) return `reason.${category as (typeof URGENT_REASONS)[number]}`
  return null
}

/** Deterministic rule check on the server (no AI, nothing stored). Fast; used to show emergency help immediately. */
export const checkSafety = (text: string, language: Lang, signal?: AbortSignal) =>
  apiRequest<SafetyResult>(`${API_V1}/safety/check`, {
    method: 'POST',
    body: JSON.stringify({ text: text.slice(0, 2000), language }),
    signal,
  })
