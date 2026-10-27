import { Info, Mic, Plus, RotateCw, Send, Square } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { MAX_MESSAGE_CHARS, NON_RETRYABLE, chatErrorKey, sendChat } from '../api/chat'
import { getConversation } from '../api/conversations'
import { checkSafety } from '../api/safety'
import type { Message } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import MessageBubble, { type UiMessage } from '../components/chat/MessageBubble'
import TypingIndicator from '../components/chat/TypingIndicator'
import EmergencyGuidance from '../components/safety/EmergencyGuidance'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import LanguageSelector from '../components/layout/LanguageSelector'
import { useLanguage } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

const toUi = (m: Message): UiMessage => ({ id: m.id, role: m.role, text: m.message_text, createdAt: m.created_at })

export default function ChatPage() {
  const { t, lang } = useLanguage()
  const { user, status: authStatus } = useAuth()
  const [params, setParams] = useSearchParams()
  const requestedId = params.get('c')

  const [messages, setMessages] = useState<UiMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<{ text: string; key: StringKey } | null>(null)
  const [notice, setNotice] = useState<StringKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [emergency, setEmergency] = useState<string[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Continue a saved conversation (signed-in users) from /chat?c=<id>.
  useEffect(() => {
    if (authStatus !== 'ready' || !user || !requestedId || requestedId === conversationId) return
    let cancelled = false
    setLoading(true)
    getConversation(requestedId)
      .then((c) => {
        if (cancelled) return
        setConversationId(c.id)
        setMessages(c.messages.map(toUi))
      })
      .catch(() => !cancelled && setNotice('chat.loadError'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [authStatus, user, requestedId, conversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || sending) return
      setFailed(null)
      setNotice(null)
      const tempId = `pending-${Date.now()}`
      setMessages((m) => [...m, { id: tempId, role: 'user', text, createdAt: new Date().toISOString(), pending: true }])
      setInput('')
      setSending(true)
      const ctrl = new AbortController()
      abortRef.current = ctrl
      // Fixed safety rules (no AI) run in parallel, so emergency guidance can appear before the AI answers.
      checkSafety(text, lang)
        .then((r) => r.level === 'emergency' && setEmergency(r.categories))
        .catch(() => {
          /* the chat response carries the same check */
        })
      try {
        const res = await sendChat({ message: text, language: lang, conversation_id: conversationId ?? undefined }, ctrl.signal)
        if (res.emergency?.level === 'emergency') setEmergency(res.emergency.categories)
        setConversationId(res.conversation_id)
        setMessages((m) => [...m.filter((x) => x.id !== tempId), toUi(res.user_message), toUi(res.assistant_message)])
        if (user) setParams({ c: res.conversation_id }, { replace: true })
      } catch (err) {
        setMessages((m) => m.filter((x) => x.id !== tempId))
        setInput(text) // never lose what the person typed
        if (err instanceof DOMException && err.name === 'AbortError') {
          setNotice('chat.stopped')
        } else {
          setFailed({ text, key: chatErrorKey(err) })
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null
        setSending(false)
      }
    },
    [sending, lang, conversationId, user, setParams],
  )

  // Let the message box grow with the text (up to a limit), then scroll inside it.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`
  }, [input])

  // A suggested question fills the box (it is not sent), so the person can edit it first.
  function applySuggestion(text: string) {
    setInput(text)
    inputRef.current?.focus()
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a line. Ignore Enter while an input method (Tamil/Hindi keyboards) is composing.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send(input)
    }
  }

  function newChat() {
    abortRef.current?.abort()
    setMessages([])
    setConversationId(null)
    setFailed(null)
    setNotice(null)
    setEmergency(null)
    setInput('')
    if (params.has('c')) setParams({}, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-3xl flex-col">
      <header className="space-y-4 border-b border-line pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">{t('chat.title')}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSelector />
            <Button variant="secondary" onClick={newChat} icon={<Plus className="size-4" aria-hidden />}>{t('chat.newChat')}</Button>
          </div>
        </div>
        {/* What this assistant is, and is not. */}
        <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
          <Info className="mt-0.5 size-4 shrink-0 text-forest-700" aria-hidden />
          {t('chat.disclaimer')}
        </p>
      </header>

      {emergency && (
        <div className="mt-5">
          <EmergencyGuidance categories={emergency} variant="alert" />
        </div>
      )}

      <section aria-label={t('chat.title')} aria-live="polite" aria-busy={sending} className="flex flex-1 flex-col gap-8 py-6">
        {loading ? (
          <Spinner label={t('common.loading')} />
        ) : messages.length === 0 && !sending ? (
          <div className="py-4 sm:py-8">
            <p className="font-display text-xl text-ink sm:text-2xl">{t('chat.empty')}</p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('chat.suggestTitle')}</p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {(['chat.suggest1', 'chat.suggest2', 'chat.suggest3'] as const).map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => applySuggestion(t(k))}
                    className="flex min-h-12 w-full items-center gap-3 px-1 py-2.5 text-left text-[0.9375rem] text-slate-700 hover:bg-sage-50 hover:text-forest-900"
                  >
                    <span className="text-terracotta-500" aria-hidden>→</span>
                    <span lang={lang}>{t(k)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {sending && <TypingIndicator />}
        <div ref={endRef} />
      </section>

      {(failed || notice) && (
        <div className="space-y-3 pb-3">
          {failed && (
            <Alert
              tone="warning"
              title={t(failed.key)}
              action={
                !NON_RETRYABLE.has(failed.key) ? (
                  <Button variant="secondary" onClick={() => void send(failed.text)} icon={<RotateCw className="size-4" aria-hidden />}>
                    {t('common.retry')}
                  </Button>
                ) : undefined
              }
            />
          )}
          {notice && <Alert tone="info">{t(notice)}</Alert>}
        </div>
      )}

      {/* Stays at the bottom of the screen (and above the phone keyboard) while the conversation scrolls. */}
      <form
        className="sticky bottom-0 -mx-4 bg-ivory/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:mx-0 sm:px-0"
        onSubmit={onSubmit}
      >
        <div className="rounded-xl border border-line bg-white shadow-sm transition-colors focus-within:border-forest-600 focus-within:ring-2 focus-within:ring-forest-100">
          <label htmlFor={inputId} className="sr-only">{t('chat.placeholder')}</label>
          <textarea
            ref={inputRef}
            id={inputId}
            rows={2}
            maxLength={MAX_MESSAGE_CHARS}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('chat.placeholder')}
            aria-describedby={hintId}
            lang={lang}
            className="block max-h-48 min-h-14 w-full resize-none bg-transparent px-4 pt-3 text-base leading-relaxed text-ink placeholder:text-slate-400 focus-visible:outline-none"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2 pl-4">
            <p id={hintId} className="min-w-0 truncate text-xs text-slate-500">
              <span className="hidden sm:inline">{t('chat.enterHint')}</span>
              {input.length > MAX_MESSAGE_CHARS * 0.9 && (
                <span aria-live="polite" className="ml-2 font-medium text-terracotta-700">{input.length} / {MAX_MESSAGE_CHARS}</span>
              )}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="ghost"
                aria-label={t('chat.voice')}
                title={t('common.notReady')}
                disabled
                className="min-h-10 px-2.5"
                icon={<Mic className="size-5" aria-hidden />}
              />
              {sending ? (
                <Button variant="danger" aria-label={t('chat.stop')} onClick={() => abortRef.current?.abort()} className="min-h-10" icon={<Square className="size-4" aria-hidden />}>
                  <span aria-hidden>{t('chat.stop')}</span>
                </Button>
              ) : (
                <Button type="submit" aria-label={t('chat.send')} disabled={!input.trim()} className="min-h-10" icon={<Send className="size-4" aria-hidden />}>
                  <span aria-hidden>{t('chat.send')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
