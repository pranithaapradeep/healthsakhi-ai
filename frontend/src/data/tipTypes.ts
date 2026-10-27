// Small, shared definitions for health tips. Kept apart from the (large) tip text in healthTips.ts so the page can
// import these statically while the text itself is loaded on demand.
import type { Lang } from '../i18n/strings'

export type Localized = Record<Lang, string>

export const TIP_CATEGORIES = ['nutrition', 'heartBrain', 'ayurveda', 'coldFever', 'digestion', 'hairSkin', 'liverKidney'] as const
export type TipCategory = (typeof TIP_CATEGORIES)[number]

export const EVIDENCE_LEVELS = ['food', 'traditional', 'limited', 'habit'] as const
export type Evidence = (typeof EVIDENCE_LEVELS)[number]

export interface HealthTip {
  id: string
  category: TipCategory
  evidence: Evidence
  /** Extra search words: English and transliterated names (e.g. "haldi", "manjal"). */
  keywords: string[]
  title: Localized
  summary: Localized
  /** Suggested food, ingredient or home-care practice. */
  suggestion: Localized
  howTo: Localized
  safety: Localized
  /** Shown under "Learn more": traditional use vs. scientific evidence, and when to see a doctor. */
  more: Localized
}

/** A photo bundled with the app (frontend/public/tips), with the credit its licence requires. */
export interface TipImage {
  src: string
  width: number
  height: number
  credit: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}
