import { describe, expect, it } from 'vitest'
import { EVIDENCE_LEVELS, HEALTH_TIPS, TIP_CATEGORIES, type HealthTip } from './healthTips'

const FIELDS = ['title', 'summary', 'suggestion', 'howTo', 'safety', 'more'] as const
const byId = (id: string) => HEALTH_TIPS.find((t) => t.id === id) as HealthTip
const allEnglish = (tip: HealthTip) => FIELDS.map((f) => tip[f].en).join(' ')

describe('health tip content', () => {
  it('has at least 5 tips in every category, unique ids and a valid evidence label', () => {
    for (const c of TIP_CATEGORIES) expect(HEALTH_TIPS.filter((t) => t.category === c).length, c).toBeGreaterThanOrEqual(5)
    expect(new Set(HEALTH_TIPS.map((t) => t.id)).size).toBe(HEALTH_TIPS.length)
    for (const t of HEALTH_TIPS) expect(EVIDENCE_LEVELS).toContain(t.evidence)
  })

  it('is complete in English, Tamil and Hindi', () => {
    for (const tip of HEALTH_TIPS) {
      for (const f of FIELDS) {
        expect(tip[f].en.trim(), `${tip.id}.${f}.en`).not.toBe('')
        expect(tip[f].ta, `${tip.id}.${f}.ta`).toMatch(/[஀-௿]/)
        expect(tip[f].hi, `${tip.id}.${f}.hi`).toMatch(/[ऀ-ॿ]/)
      }
    }
  })

  it('never claims a cure, a detox or raised platelets', () => {
    for (const tip of HEALTH_TIPS) {
      const text = allEnglish(tip).replace(/not a proven cure/gi, '')
      expect(text, tip.id).not.toMatch(/\bcur(e|es|ed|ing)\b/i)
      expect(text, tip.id).not.toMatch(/\b(boosts?|increases?|raises?)\s+(your\s+)?platelets?\b/i)
      expect(text, tip.id).not.toMatch(/\bdetoxif(y|ies)\b/i)
    }
  })

  it('never recommends honey for babies under 12 months', () => {
    const honey = byId('honey-cough')
    expect(honey.safety.en).toMatch(/Never give honey to babies under 12 months/)
    expect(honey.safety.ta).toContain('12 மாதத்துக்குக் குறைவான')
    expect(honey.safety.hi).toContain('12 महीने से छोटे')
    expect(byId('ginger').suggestion.en).toMatch(/over 1 year/)
  })

  it('sends suspected dengue to a doctor and does not endorse papaya-leaf self-treatment', () => {
    const papaya = byId('papaya-leaf-dengue')
    expect(papaya.evidence).toBe('limited')
    expect(papaya.summary.en).toMatch(/not enough to recommend self-treatment/)
    expect(papaya.summary.en).toMatch(/Dengue needs medical assessment/)
    for (const lang of ['en', 'ta', 'hi'] as const) expect(papaya.safety[lang]).toContain('112')
  })

  it('separates traditional use from scientific evidence for herbs', () => {
    for (const id of ['tulsi', 'turmeric', 'amla', 'keezhanelli-herb', 'hibiscus-hair', 'aloe-vera', 'keezhanelli-liver']) {
      const more = byId(id).more.en
      expect(more, id).toMatch(/Traditional use:/)
      expect(more, id).toMatch(/Scientific evidence:/)
    }
    for (const id of ['keezhanelli-herb', 'keezhanelli-liver']) {
      expect(byId(id).evidence).not.toBe('food')
      expect(byId(id).summary.en).toMatch(/not (a proven treatment|been shown)/)
    }
  })

  it('gives patch-test advice for topical ingredients and promises no hair regrowth', () => {
    for (const id of ['scalp-massage', 'hibiscus-hair', 'aloe-vera', 'gentle-skin-care']) expect(byId(id).safety.en, id).toMatch(/patch[- ]test/i)
    for (const id of ['scalp-massage', 'hibiscus-hair']) expect(byId(id).safety.en, id).toMatch(/will not regrow/)
  })

  it('reminds people with kidney disease or fluid limits to follow their clinician', () => {
    for (const id of ['fluids-digestion', 'warm-lemon-ginger-water', 'hydration', 'kidney-fluids']) {
      expect(allEnglish(byId(id)), id).toMatch(/kidney/i)
      expect(allEnglish(byId(id)), id).toMatch(/clinician|doctor/i)
    }
  })

  it('flags liver and kidney warning signs for prompt assessment', () => {
    const text = HEALTH_TIPS.filter((t) => t.category === 'liverKidney').map(allEnglish).join(' ')
    for (const sign of ['jaundice', 'blood in the urine', 'severe abdominal pain', 'reduced urine output']) expect(text.toLowerCase()).toContain(sign)
    expect(byId('alcohol-detox').safety.en).toMatch(/detox/i)
  })

  it('never tells people to stop prescribed medicines', () => {
    for (const tip of HEALTH_TIPS) expect(allEnglish(tip), tip.id).not.toMatch(/\bstop (taking )?your (prescribed )?medicines?\b/i)
  })
})
