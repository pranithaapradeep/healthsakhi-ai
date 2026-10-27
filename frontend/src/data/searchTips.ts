import type { HealthTip, TipCategory } from './healthTips'

/** Lower-case, Unicode-normalised text for matching (works for Latin, Tamil and Devanagari). */
export const normalize = (s: string) => s.normalize('NFC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Tips in `category` ('all' = every category) whose title, description, suggested food/ingredient, keywords or
 * category name contain every word of `query` — in any of the three languages, so "ginger", "இஞ்சி" and "अदरक"
 * all work whatever language the page is in.
 */
export function filterTips(
  tips: readonly HealthTip[],
  category: TipCategory | 'all',
  query: string,
  categoryNames: Record<TipCategory, readonly string[]>,
): HealthTip[] {
  const words = normalize(query).split(' ').filter(Boolean)
  return tips.filter((tip) => {
    if (category !== 'all' && tip.category !== category) return false
    if (words.length === 0) return true
    const text = normalize(
      [
        ...Object.values(tip.title),
        ...Object.values(tip.summary),
        ...Object.values(tip.suggestion),
        ...tip.keywords,
        ...categoryNames[tip.category],
      ].join(' '),
    )
    return words.every((w) => text.includes(w))
  })
}
