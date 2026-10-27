import type { Lang, StringKey } from '../i18n/strings'
import { chatErrorKey } from './chat'
import { API_V1, ApiError, apiRequest } from './client'
import type { RedFlag, SafetyResult } from './safety'

export const DURATIONS = ['lt_1d', '1_3d', '4_7d', '1_4w', 'gt_4w'] as const
export const SEVERITIES = ['mild', 'moderate', 'severe'] as const
export const TRENDS = ['better', 'same', 'worse'] as const
export const AGE_GROUPS = ['infant', 'child', 'adult', 'older_adult'] as const
export const PREGNANCY = ['yes', 'no', 'unsure'] as const

export type Duration = (typeof DURATIONS)[number]
export type Severity = (typeof SEVERITIES)[number]
export type Trend = (typeof TRENDS)[number]
export type AgeGroup = (typeof AGE_GROUPS)[number]
export type Pregnancy = (typeof PREGNANCY)[number] | 'not_applicable'
export type Urgency = 'emergency' | 'urgent' | 'routine'

export const MAX_SYMPTOMS = 1000
export const MAX_OTHER = 500
export const MAX_ANSWER = 300

export interface FollowUpAnswer {
  question: string
  answer: string
}

export interface AssessmentRequest {
  language: Lang
  red_flags: RedFlag[]
  symptoms: string
  other_symptoms: string
  duration: Duration
  severity: Severity
  trend: Trend
  age_group: AgeGroup
  pregnant: Pregnancy
  followups: FollowUpAnswer[]
}

export interface AssessmentResult {
  urgency: Urgency
  urgency_source: 'safety_rules' | 'ai'
  summary: string
  possible_explanations: string[]
  self_care: string[]
  seek_care_if: string[]
  recommended_next_step: string
}

export interface AssessmentResponse {
  status: 'emergency' | 'need_more_info' | 'complete'
  language: Lang
  safety: SafetyResult
  follow_up_questions: string[]
  result: AssessmentResult | null
}

export const submitAssessment = (data: AssessmentRequest, signal?: AbortSignal) =>
  apiRequest<AssessmentResponse>(`${API_V1}/assessment`, { method: 'POST', body: JSON.stringify(data), signal })

/** Error message for the symptom checker. Same as chat, except an unusable AI answer gets its own message. */
export function assessmentErrorKey(err: unknown): StringKey {
  if (err instanceof ApiError && err.status === 502 && err.message === 'ai_bad_response') return 'chat.errorBadResponse'
  return chatErrorKey(err)
}
