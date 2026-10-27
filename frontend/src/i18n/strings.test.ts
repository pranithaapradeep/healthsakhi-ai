import { describe, expect, it } from 'vitest'
import { LANGUAGES, STRINGS, isLang } from './strings'

describe('UI strings', () => {
  const enKeys = Object.keys(STRINGS.en).sort()

  it.each(['ta', 'hi'] as const)('%s has exactly the same keys as English', (lang) => {
    expect(Object.keys(STRINGS[lang]).sort()).toEqual(enKeys)
  })

  it.each(['en', 'ta', 'hi'] as const)('%s has no empty strings', (lang) => {
    for (const [key, value] of Object.entries(STRINGS[lang])) {
      expect(value.trim(), key).not.toBe('')
    }
  })

  it('Tamil strings use Tamil script and Hindi strings use Devanagari', () => {
    expect(STRINGS.ta['nav.home']).toMatch(/[஀-௿]/)
    expect(STRINGS.hi['nav.home']).toMatch(/[ऀ-ॿ]/)
  })

  it('emergency text names 112 in every language', () => {
    for (const lang of ['en', 'ta', 'hi'] as const) {
      expect(STRINGS[lang]['emergency.body']).toContain('112')
      expect(STRINGS[lang]['emergency.call']).toContain('112')
    }
  })

  it('supports exactly Tamil, Hindi and English', () => {
    expect(LANGUAGES.map((l) => l.code).sort()).toEqual(['en', 'hi', 'ta'])
    expect(isLang('ta')).toBe(true)
    expect(isLang('fr')).toBe(false)
    expect(isLang(null)).toBe(false)
  })
})
