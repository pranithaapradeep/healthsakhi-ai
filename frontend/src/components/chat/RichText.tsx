import { Fragment, type ReactNode } from 'react'

/**
 * Renders the small subset of formatting the assistant is asked to use: paragraphs, "- " bullet lists,
 * "1." numbered lists, "## " headings and **bold**. Builds React elements only — never injects HTML — so model
 * output or user text can't run scripts or add markup.
 */

type Block = { kind: 'p'; lines: string[] } | { kind: 'ul' | 'ol'; items: string[] } | { kind: 'h'; text: string }

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^\s*#{1,4}\s+(.*)$/

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    const last = blocks[blocks.length - 1]
    const heading = HEADING.exec(line)
    const bullet = heading ? null : BULLET.exec(line)
    const numbered = heading || bullet ? null : NUMBERED.exec(line)
    if (!line.trim()) {
      blocks.push({ kind: 'p', lines: [] }) // paragraph break
    } else if (heading) {
      blocks.push({ kind: 'h', text: heading[1].replace(/^\*\*(.*)\*\*$/, '$1') })
    } else if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol'
      const item = (bullet ?? numbered)![1]
      if (last && last.kind === kind) last.items.push(item)
      else blocks.push({ kind, items: [item] })
    } else if (last && last.kind === 'p' && last.lines.length > 0) {
      last.lines.push(line)
    } else {
      blocks.push({ kind: 'p', lines: [line] })
    }
  }
  return blocks.filter((b) => (b.kind === 'p' ? b.lines.length > 0 : b.kind === 'h' ? b.text.trim() !== '' : b.items.length > 0))
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

export default function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {parseBlocks(text).map((b, i) =>
        b.kind === 'h' ? (
          <h3 key={i} className="pt-2 font-sans text-[1.0625rem] font-semibold leading-snug text-ink first:pt-0">{inline(b.text)}</h3>
        ) : b.kind === 'p' ? (
          <p key={i}>
            {b.lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        ) : b.kind === 'ul' ? (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-forest-500">
            {b.items.map((it, j) => <li key={j} className="pl-1">{inline(it)}</li>)}
          </ul>
        ) : (
          <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-forest-700">
            {b.items.map((it, j) => <li key={j} className="pl-1">{inline(it)}</li>)}
          </ol>
        ),
      )}
    </div>
  )
}
