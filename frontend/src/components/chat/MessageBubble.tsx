import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { LANGUAGES } from '../../i18n/strings'
import RichText from './RichText'

export interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  pending?: boolean
}

/**
 * One message. The person's messages are short sage bubbles on the right; the assistant's replies are
 * set as readable text (no bubble) with a quiet left rule, so long answers read like a well-set article.
 */
export default function MessageBubble({ message }: { message: UiMessage }) {
  const { t, lang } = useLanguage()
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const isUser = message.role === 'user'

  useEffect(() => {
    if (copy === 'idle') return
    const id = window.setTimeout(() => setCopy('idle'), 2000)
    return () => window.clearTimeout(id)
  }, [copy])

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  const bcp47 = LANGUAGES.find((l) => l.code === lang)?.bcp47 ?? 'en-IN'
  const date = new Date(message.createdAt)
  const time = new Intl.DateTimeFormat(bcp47, { timeStyle: 'short' }).format(date)
  const full = new Intl.DateTimeFormat(bcp47, { dateStyle: 'medium', timeStyle: 'short' }).format(date)

  if (isUser) {
    return (
      <article aria-label={t('chat.you')} className="ml-auto flex max-w-[88%] flex-col items-end gap-1 sm:max-w-[75%]">
        <div className={`rounded-2xl rounded-tr-md bg-sage-100 px-4 py-2.5 text-base leading-relaxed text-ink ${message.pending ? 'opacity-60' : ''}`}>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
        <p className="flex items-center gap-1.5 px-1 text-xs text-slate-500">
          <span className="sr-only">{t('chat.you')}</span>
          <time dateTime={message.createdAt} title={full}>{time}</time>
        </p>
      </article>
    )
  }

  return (
    <article aria-label={t('chat.assistant')} className="group flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-forest-800">
        <span className="size-1.5 rounded-full bg-forest-600" aria-hidden />
        {t('chat.assistant')}
      </p>
      <div className="max-w-[68ch] border-l-2 border-forest-100 pl-4 text-[1.0625rem] leading-[1.7] text-slate-800 sm:pl-5">
        <RichText text={message.text} />
      </div>
      <div className="flex items-center gap-3 pl-4 text-xs text-slate-500 sm:pl-5">
        <time dateTime={message.createdAt} title={full}>{time}</time>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 font-medium text-slate-600 hover:bg-sage-100 hover:text-forest-800"
        >
          {copy === 'copied' ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copy === 'copied' ? t('chat.copied') : copy === 'failed' ? t('chat.copyFailed') : t('chat.copy')}
        </button>
      </div>
    </article>
  )
}
