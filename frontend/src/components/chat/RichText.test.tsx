import { describe, expect, it } from 'vitest'
import { parseBlocks } from './RichText'

describe('parseBlocks', () => {
  it('groups paragraphs, bullets and numbered lists', () => {
    expect(parseBlocks('Hello\nthere\n\n- a\n- b\n1. x\n2) y\nEnd')).toEqual([
      { kind: 'p', lines: ['Hello', 'there'] },
      { kind: 'ul', items: ['a', 'b'] },
      { kind: 'ol', items: ['x', 'y'] },
      { kind: 'p', lines: ['End'] },
    ])
  })

  it('handles Tamil and Hindi text and Windows line endings', () => {
    expect(parseBlocks('- ஓய்வு\r\n- पानी')).toEqual([{ kind: 'ul', items: ['ஓய்வு', 'पानी'] }])
  })

  it('ignores empty input', () => {
    expect(parseBlocks('\n\n')).toEqual([])
  })

  it('reads "#" headings (and drops bold markers around them)', () => {
    expect(parseBlocks('## Self-care\n- Rest\n### **When to worry**')).toEqual([
      { kind: 'h', text: 'Self-care' },
      { kind: 'ul', items: ['Rest'] },
      { kind: 'h', text: 'When to worry' },
    ])
    expect(parseBlocks('#hashtag is not a heading')).toEqual([{ kind: 'p', lines: ['#hashtag is not a heading'] }])
  })
})
