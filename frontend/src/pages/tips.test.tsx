import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HEALTH_TIPS } from '../data/healthTips'
import { TIP_IMAGE_ALT } from '../data/tipImageAlt'
import { STRINGS } from '../i18n/strings'
import { renderApp } from '../test/renderApp'

// Two bundled photos; every other slot shows its illustrated fallback.
vi.mock('../data/tipImages.generated', () => ({
  TIP_IMAGES: {
    'honey-cough': {
      src: '/tips/honey-cough.jpg', width: 500, height: 333, credit: 'Jane Doe', license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Honey.jpg',
    },
    'cat:ayurveda': {
      src: '/tips/cat-ayurveda.jpg', width: 500, height: 375, credit: 'A. N. Other', license: 'CC0', licenseUrl: null,
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tulsi.jpg',
    },
  },
}))

const en = STRINGS.en
const honey = HEALTH_TIPS.find((t) => t.id === 'honey-cough')!
const papaya = HEALTH_TIPS.find((t) => t.id === 'papaya-leaf-dengue')!
const cards = () => screen.queryAllByRole('article')
const chip = (name: string) => screen.getByRole('button', { name })

async function openTips(lang?: 'en' | 'ta' | 'hi') {
  renderApp('/tips', lang)
  await screen.findAllByRole('article') // tip text is loaded on demand
}

describe('health tips page', () => {
  it('replaces the placeholder with all tips, categories and safety notices', async () => {
    await openTips()
    expect(screen.queryByText(en['common.notReady'])).toBeNull()
    expect(cards()).toHaveLength(HEALTH_TIPS.length)
    expect(screen.getByText(en['tips.count'].replace('{count}', String(HEALTH_TIPS.length)))).toBeInTheDocument()
    const group = screen.getByRole('group', { name: en['tips.categories'] })
    expect(within(group).getAllByRole('button')).toHaveLength(8)
    expect(chip(en['tips.allTitle'])).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(en['tips.intro'])).toBeInTheDocument()
    const urgent = screen.getByRole('heading', { name: en['tips.urgentTitle'] }).closest('section')!
    expect(within(urgent).getByRole('link', { name: /112/ })).toHaveAttribute('href', 'tel:112')
  })

  it('filters by category', async () => {
    await openTips()
    fireEvent.click(chip(en['tips.cat.heartBrain']))
    expect(chip(en['tips.cat.heartBrain'])).toHaveAttribute('aria-pressed', 'true')
    expect(chip(en['tips.allTitle'])).toHaveAttribute('aria-pressed', 'false')
    expect(cards()).toHaveLength(5)
    for (const card of cards()) expect(within(card).getByText(en['tips.cat.heartBrain'])).toBeInTheDocument()
    fireEvent.click(chip(en['tips.allTitle']))
    expect(cards()).toHaveLength(HEALTH_TIPS.length)
  })

  it('"Learn more" expands and collapses the details', async () => {
    await openTips()
    const card = screen.getByRole('article', { name: honey.title.en })
    const more = within(card).getByText(honey.more.en)
    expect(more).not.toBeVisible()
    const btn = within(card).getByRole('button', { name: en['tips.learnMore'] })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(btn).toHaveTextContent(en['tips.showLess'])
    expect(more).toBeVisible()
    fireEvent.click(btn)
    expect(more).not.toBeVisible()
  })

  it('shows evidence labels and safety notes on the cards', async () => {
    await openTips()
    const honeyCard = screen.getByRole('article', { name: honey.title.en })
    expect(within(honeyCard).getByText(en['tips.evidence.food'])).toBeInTheDocument()
    expect(within(honeyCard).getByRole('note', { name: en['tips.safety'] })).toHaveTextContent('Never give honey to babies under 12 months')
    const papayaCard = screen.getByRole('article', { name: papaya.title.en })
    expect(within(papayaCard).getByText(en['tips.evidence.limited'])).toBeInTheDocument()
    expect(within(papayaCard).getByRole('note')).toHaveTextContent('112')
    const tulsiCard = screen.getByRole('article', { name: HEALTH_TIPS.find((t) => t.id === 'tulsi')!.title.en })
    expect(within(tulsiCard).getByText(en['tips.evidence.traditional'])).toBeInTheDocument()
  })

  it('shows tips in Tamil and switches to Hindi', async () => {
    await openTips('ta')
    expect(screen.getByRole('heading', { level: 1, name: STRINGS.ta['tips.title'] })).toBeInTheDocument()
    const card = screen.getByRole('article', { name: honey.title.ta })
    expect(within(card).getByRole('note')).toHaveTextContent('12 மாதத்துக்குக் குறைவான')
    expect(chip(STRINGS.ta['tips.cat.coldFever'])).toBeInTheDocument()

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'hi' } })
    expect(screen.getByRole('article', { name: honey.title.hi })).toBeInTheDocument()
    expect(chip(STRINGS.hi['tips.cat.coldFever'])).toBeInTheDocument()
    expect(screen.getByText(STRINGS.hi['tips.quote'])).toBeInTheDocument()
  })

  it('shows a wellness quote instead of a search box, in every language', async () => {
    await openTips()
    expect(screen.queryByRole('searchbox')).toBeNull()
    const quote = screen.getByText(en['tips.quote'])
    const figure = quote.closest('figure')!
    expect(quote.closest('blockquote')).not.toBeNull()
    expect(within(figure).getByText(`— ${en['tips.quoteAuthor']}`)).toBeInTheDocument()
    // The decorative quotation mark is hidden from screen readers.
    expect(figure.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    for (const lang of ['ta', 'hi'] as const) {
      expect(STRINGS[lang]['tips.quote']).not.toBe(en['tips.quote'])
      expect(STRINGS[lang]['tips.quote'].length).toBeLessThan(120) // short enough for a small card
    }
  })

  it('in Tamil, shows the Tamil quote and the category filter still works', async () => {
    await openTips('ta')
    expect(screen.getByText(STRINGS.ta['tips.quote'])).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).toBeNull()
    fireEvent.click(chip(STRINGS.ta['tips.cat.ayurveda']))
    expect(cards()).toHaveLength(5)
    expect(chip(STRINGS.ta['tips.cat.ayurveda'])).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('health tips page — images', () => {
  it('shows a lazy-loaded photo with descriptive alt text and credits it under "Learn more"', async () => {
    await openTips()
    const card = screen.getByRole('article', { name: honey.title.en })
    const img = within(card).getByRole('img', { name: TIP_IMAGE_ALT['honey-cough'].en })
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', '/tips/honey-cough.jpg')
    expect(img).toHaveAttribute('loading', 'lazy')
    fireEvent.click(within(card).getByRole('button', { name: en['tips.learnMore'] }))
    const credit = within(card).getByRole('link', { name: /Jane Doe · CC BY-SA 4\.0 · Wikimedia Commons/ })
    expect(credit).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Honey.jpg')
  })

  it('falls back to an illustration with the same alt text if the photo fails to load', async () => {
    await openTips()
    const card = screen.getByRole('article', { name: honey.title.en })
    fireEvent.error(within(card).getByRole('img', { name: TIP_IMAGE_ALT['honey-cough'].en }))
    const fallback = within(card).getByRole('img', { name: TIP_IMAGE_ALT['honey-cough'].en })
    expect(fallback.tagName).toBe('DIV')
    expect(fallback).toHaveAttribute('data-testid', 'tip-image-fallback')
  })

  it('uses an illustration when a tip has no photo, and gives no credit line', async () => {
    await openTips()
    const tulsi = HEALTH_TIPS.find((t) => t.id === 'tulsi')!
    const card = screen.getByRole('article', { name: tulsi.title.en })
    expect(within(card).getByRole('img', { name: TIP_IMAGE_ALT.tulsi.en })).toHaveAttribute('data-testid', 'tip-image-fallback')
    fireEvent.click(within(card).getByRole('button', { name: en['tips.learnMore'] }))
    expect(within(card).queryByRole('link', { name: /Wikimedia Commons/ })).toBeNull()
  })

  it('every tip and category has alt text in all three languages', () => {
    for (const id of [...HEALTH_TIPS.map((t) => t.id), 'cat:nutrition', 'cat:heartBrain', 'cat:ayurveda', 'cat:coldFever', 'cat:digestion', 'cat:hairSkin', 'cat:liverKidney']) {
      for (const lang of ['en', 'ta', 'hi'] as const) expect(TIP_IMAGE_ALT[id]?.[lang]?.trim(), `${id}.${lang}`).toBeTruthy()
    }
  })

  it('alt text follows the page language', async () => {
    await openTips('ta')
    expect(screen.getByRole('img', { name: TIP_IMAGE_ALT['honey-cough'].ta })).toHaveAttribute('src', '/tips/honey-cough.jpg')
  })

  it('category tiles are keyboard-reachable buttons whose pictures are decorative', async () => {
    await openTips()
    const group = screen.getByRole('group', { name: en['tips.categories'] })
    expect(within(group).queryAllByRole('img')).toHaveLength(0)
    const tile = chip(en['tips.cat.ayurveda'])
    expect(tile.tagName).toBe('BUTTON')
    expect(tile).toHaveAccessibleDescription(en['tips.sub.ayurveda'])
    tile.focus()
    expect(tile).toHaveFocus()
    fireEvent.click(tile)
    expect(cards()).toHaveLength(5)
  })

  it('shows the friendly heading, the comfort note and a balanced 112 call button', async () => {
    await openTips()
    expect(screen.getByRole('heading', { level: 1, name: en['tips.title'] })).toBeInTheDocument()
    expect(screen.getByText(en['tips.heroTitle'])).toBeInTheDocument()
    expect(screen.getByText(en['tips.comfortNote'])).toBeInTheDocument()
    const urgent = screen.getByRole('heading', { name: en['tips.urgentTitle'] }).closest('section')!
    expect(within(urgent).getByRole('link', { name: /112/ })).toHaveAttribute('href', 'tel:112')
  })
})

describe('compact category tiles', () => {
  const originalScroll = Element.prototype.scrollIntoView
  afterEach(() => {
    vi.restoreAllMocks()
    Element.prototype.scrollIntoView = originalScroll
  })

  it('show a small thumbnail beside each name: photo when there is one, illustration otherwise', async () => {
    await openTips()
    const group = screen.getByRole('group', { name: en['tips.categories'] })
    const ayurveda = chip(en['tips.cat.ayurveda'])
    const photo = ayurveda.querySelector('img')!
    expect(photo).toHaveAttribute('src', '/tips/cat-ayurveda.jpg')
    expect(photo).toHaveAttribute('alt', '')
    expect(photo).toHaveAttribute('loading', 'lazy')
    // No photo for nutrition in this test, and "All tips" always uses its icon.
    expect(within(chip(en['tips.cat.nutrition'])).getByTestId('tip-image-fallback')).toHaveAttribute('aria-hidden', 'true')
    expect(within(chip(en['tips.allTitle'])).getByTestId('tip-image-fallback')).toBeInTheDocument()
    expect(within(group).queryAllByRole('img')).toHaveLength(0)
  })

  it('keep their names and descriptions in Tamil and Hindi', async () => {
    await openTips('ta')
    const ta = STRINGS.ta
    expect(screen.getByRole('button', { name: ta['tips.cat.coldFever'] })).toHaveAccessibleDescription(ta['tips.sub.coldFever'])
  })

  it('bring the tips into view after choosing a category when they start below the screen', async () => {
    await openTips()
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const results = screen.getByRole('region', { name: en['tips.title'] })
    vi.spyOn(results, 'getBoundingClientRect').mockReturnValue({ top: window.innerHeight + 400 } as DOMRect)
    const tile = chip(en['tips.cat.digestion'])
    tile.focus()
    fireEvent.click(tile)
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(tile).toHaveFocus() // focus is not moved
    expect(cards()).toHaveLength(5)
  })

  it('do not scroll when the tips are already visible', async () => {
    await openTips()
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const results = screen.getByRole('region', { name: en['tips.title'] })
    vi.spyOn(results, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect)
    fireEvent.click(chip(en['tips.cat.hairSkin']))
    expect(scroll).not.toHaveBeenCalled()
  })
})
