import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatRequest } from '../api/chat'
import { STRINGS } from '../i18n/strings'
import { USER, callsTo, fakeResponse, mockApi } from '../test/mockApi'
import { renderApp } from '../test/renderApp'

const CHAT = 'POST /api/v1/chat'
const guest = { 'GET /api/v1/auth/me': { status: 401 } }
let n = 0

function reply(req: ChatRequest, text = 'Rest and drink water.') {
  n += 1
  return {
    status: 200,
    body: {
      conversation_id: req.conversation_id ?? 'conv-1',
      language: req.language,
      title: req.message,
      user_message: { id: `u${n}`, role: 'user', message_text: req.message, created_at: '2026-10-25T10:00:00Z' },
      assistant_message: { id: `a${n}`, role: 'assistant', message_text: text, created_at: '2026-10-25T10:00:05Z' },
      emergency: null,
    },
  }
}

const body = (init: RequestInit) => JSON.parse(String(init.body)) as ChatRequest
const input = () => screen.getByLabelText(STRINGS.en['chat.placeholder'])

function typeText(text: string) {
  fireEvent.change(input(), { target: { value: text } })
}

/** fetch whose /chat call stays pending until resolved, and rejects with AbortError if aborted. */
function pendingChat() {
  let resolveChat: (r: Response) => void = () => {}
  const fn = vi.fn((url: string, init: RequestInit = {}) => {
    if (String(url).includes('/auth/me')) return Promise.resolve(fakeResponse(401))
    return new Promise<Response>((resolve, reject) => {
      resolveChat = resolve
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })
  })
  vi.stubGlobal('fetch', fn)
  return { fn, resolve: (r: Response) => resolveChat(r) }
}

describe('chat', () => {
  it('lets a guest send a message and shows both sides with timestamps', async () => {
    const fetchMock = mockApi({ ...guest, [CHAT]: (init) => reply(body(init)) })
    renderApp('/chat')
    typeText('I have had a headache for two days.')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))

    const assistant = await screen.findByRole('article', { name: STRINGS.en['chat.assistant'] })
    expect(within(assistant).getByText('Rest and drink water.')).toBeInTheDocument()
    expect(within(assistant).getByRole('button', { name: STRINGS.en['chat.copy'] })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: STRINGS.en['chat.you'] })).toHaveTextContent('I have had a headache for two days.')
    expect(assistant.querySelector('time')).toHaveAttribute('dateTime', '2026-10-25T10:00:05Z')

    const [[, init]] = callsTo(fetchMock, 'POST', '/api/v1/chat')
    expect(body(init as RequestInit)).toEqual({ message: 'I have had a headache for two days.', language: 'en' })
    expect(input()).toHaveValue('')
  })

  it('continues the same conversation on the next message', async () => {
    const fetchMock = mockApi({ ...guest, [CHAT]: (init) => reply(body(init)) })
    renderApp('/chat')
    typeText('first')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    await screen.findByText('first')
    await waitFor(() => expect(screen.getByRole('button', { name: STRINGS.en['chat.send'] })).toBeInTheDocument())
    typeText('second')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    await screen.findByText('second')
    const calls = callsTo(fetchMock, 'POST', '/api/v1/chat')
    expect(body(calls[1][1] as RequestInit).conversation_id).toBe('conv-1')
  })

  it('sends the selected language (Tamil) and keeps native script intact', async () => {
    const tamil = 'எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.'
    const fetchMock = mockApi({ ...guest, [CHAT]: (init) => reply(body(init), 'ஓய்வு எடுங்கள்.') })
    renderApp('/chat', 'ta')
    fireEvent.change(screen.getByLabelText(STRINGS.ta['chat.placeholder']), { target: { value: tamil } })
    fireEvent.click(screen.getByRole('button', { name: STRINGS.ta['chat.send'] }))
    expect(await screen.findByText('ஓய்வு எடுங்கள்.')).toBeInTheDocument()
    const [[, init]] = callsTo(fetchMock, 'POST', '/api/v1/chat')
    expect(body(init as RequestInit)).toEqual({ message: tamil, language: 'ta' })
  })

  it('shows a typing indicator while waiting and can stop without losing the message', async () => {
    pendingChat()
    renderApp('/chat')
    typeText('Is this serious?')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))

    expect(await screen.findByText(STRINGS.en['chat.typing'])).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.stop'] }))

    expect(await screen.findByText(STRINGS.en['chat.stopped'])).toBeInTheDocument()
    expect(screen.queryByText(STRINGS.en['chat.typing'])).not.toBeInTheDocument()
    expect(input()).toHaveValue('Is this serious?')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows a clear error and retries successfully', async () => {
    let attempt = 0
    mockApi({ ...guest, [CHAT]: (init) => (++attempt === 1 ? { status: 504, body: { detail: 'ai_timeout' } } : reply(body(init))) })
    renderApp('/chat')
    typeText('hello')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))

    expect(await screen.findByText(STRINGS.en['chat.errorTimeout'])).toBeInTheDocument()
    expect(input()).toHaveValue('hello') // the typed text is restored
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['common.retry'] }))
    expect(await screen.findByText('Rest and drink water.')).toBeInTheDocument()
    expect(screen.queryByText(STRINGS.en['chat.errorTimeout'])).not.toBeInTheDocument()
  })

  it('explains when the AI is not configured, without a pointless retry', async () => {
    mockApi({ ...guest, [CHAT]: { status: 503, body: { detail: 'ai_not_configured' } } })
    renderApp('/chat')
    typeText('hello')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    expect(await screen.findByText(STRINGS.en['chat.errorNotConfigured'])).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: STRINGS.en['common.retry'] })).not.toBeInTheDocument()
  })

  it.each([
    [429, 'too_many_messages', 'chat.errorRateLimited', true],
    [429, 'ai_rate_limited', 'chat.errorAiQuota', true],
    [503, 'ai_unavailable', 'chat.errorUnavailable', true],
    [503, 'ai_model_unavailable', 'chat.errorModelUnavailable', false],
    [413, 'ai_request_too_large', 'chat.errorTooLong', false],
  ] as const)('maps HTTP %s %s to a friendly message', async (status, detail, key, retryable) => {
    mockApi({ ...guest, [CHAT]: { status, body: { detail } } })
    renderApp('/chat')
    typeText('hello')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    expect(await screen.findByText(STRINGS.en[key])).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: STRINGS.en['common.retry'] }) !== null).toBe(retryable)
  })

  it('sends on Enter but not on Shift+Enter', async () => {
    const fetchMock = mockApi({ ...guest, [CHAT]: (init) => reply(body(init)) })
    renderApp('/chat')
    typeText('line one')
    fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true })
    expect(callsTo(fetchMock, 'POST', '/api/v1/chat')).toHaveLength(0)
    fireEvent.keyDown(input(), { key: 'Enter' })
    await screen.findByText('Rest and drink water.')
    expect(callsTo(fetchMock, 'POST', '/api/v1/chat')).toHaveLength(1)
  })

  it('starts a new conversation', async () => {
    const fetchMock = mockApi({ ...guest, [CHAT]: (init) => reply(body(init)) })
    renderApp('/chat')
    typeText('first')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    await screen.findByText('Rest and drink water.')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.newChat'] }))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByText(STRINGS.en['chat.empty'])).toBeInTheDocument()
    typeText('fresh start')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    await screen.findByText('fresh start')
    const calls = callsTo(fetchMock, 'POST', '/api/v1/chat')
    expect(body(calls[1][1] as RequestInit).conversation_id).toBeUndefined()
  })

  it('copies an assistant reply', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    mockApi({ ...guest, [CHAT]: (init) => reply(body(init)) })
    renderApp('/chat')
    typeText('hello')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    fireEvent.click(await screen.findByRole('button', { name: STRINGS.en['chat.copy'] }))
    expect(await screen.findByText(STRINGS.en['chat.copied'])).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith('Rest and drink water.')
  })

  it('renders lists and bold text but never injects HTML', async () => {
    const risky = 'Try this:\n- Rest\n- Drink **water**\n\n1. First\n2. Second\n<img src=x onerror="alert(1)">'
    mockApi({ ...guest, [CHAT]: (init) => reply(body(init), risky) })
    const { container } = renderApp('/chat')
    typeText('hello')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    const assistant = await screen.findByRole('article', { name: STRINGS.en['chat.assistant'] })
    expect(within(assistant).getAllByRole('listitem')).toHaveLength(4)
    expect(within(assistant).getByText('water').tagName).toBe('STRONG')
    expect(container.querySelector('img')).toBeNull()
    expect(assistant).toHaveTextContent('<img src=x onerror="alert(1)">')
  })

  it('reopens a saved conversation for a signed-in user', async () => {
    mockApi({
      'GET /api/v1/auth/me': { status: 200, body: USER },
      'GET /api/v1/conversations/c42': {
        status: 200,
        body: {
          id: 'c42',
          title: 'Headache',
          language: 'en',
          created_at: '2026-10-24T10:00:00Z',
          updated_at: '2026-10-24T10:01:00Z',
          messages: [
            { id: 'm1', role: 'user', message_text: 'Saved question', created_at: '2026-10-24T10:00:00Z' },
            { id: 'm2', role: 'assistant', message_text: 'Saved answer', created_at: '2026-10-24T10:00:05Z' },
          ],
        },
      },
    })
    renderApp('/chat?c=c42')
    expect(await screen.findByText('Saved answer')).toBeInTheDocument()
    expect(screen.getByText('Saved question')).toBeInTheDocument()
  })

  it('keeps the medical disclaimer and 112 guidance visible', () => {
    mockApi(guest)
    renderApp('/chat')
    expect(screen.getByText(STRINGS.en['chat.disclaimer'])).toBeInTheDocument()
    screen.getAllByRole('link', { name: /112/ }).forEach((a) => expect(a).toHaveAttribute('href', 'tel:112'))
  })

  it('shows emergency guidance from the fast safety check before the AI replies', async () => {
    let resolveChat: (r: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('/auth/me')) return Promise.resolve(fakeResponse(401))
        if (String(url).includes('/safety/check'))
          return Promise.resolve(fakeResponse(200, { level: 'emergency', categories: ['chest_pain'], rule_ids: ['chest_pain'] }))
        return new Promise<Response>((resolve) => {
          resolveChat = resolve
        })
      }),
    )
    renderApp('/chat')
    typeText('I have crushing chest pain')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('heading', { name: STRINGS.en['emergency.detectedTitle'] })).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: STRINGS.en['emergency.call'] })).toHaveAttribute('href', 'tel:112')
    expect(within(alert).getByText(STRINGS.en['flag.chest_pain'])).toBeInTheDocument()
    expect(screen.getByText(STRINGS.en['chat.typing'])).toBeInTheDocument() // AI still pending
    resolveChat(fakeResponse(503, { detail: 'ai_unavailable' }))
    expect(await screen.findByText(STRINGS.en['chat.errorUnavailable'])).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: STRINGS.en['emergency.detectedTitle'] })).toBeInTheDocument() // still shown
  })

  it('shows emergency guidance from the chat response when the quick check failed', async () => {
    mockApi({
      ...guest,
      [CHAT]: (init) => ({
        ...reply(body(init), 'This may be a medical emergency. Call 112 now.'),
        body: { ...reply(body(init), 'This may be a medical emergency. Call 112 now.').body, emergency: { level: 'emergency', categories: ['breathing'], rule_ids: ['breathing_severe'] } },
      }),
    })
    renderApp('/chat')
    typeText('I cannot breathe')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    expect(await screen.findByText(STRINGS.en['flag.breathing'])).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.newChat'] }))
    expect(screen.queryByText(STRINGS.en['flag.breathing'])).not.toBeInTheDocument()
  })
})

describe('chat layout', () => {
  it('offers suggested questions that fill the box without sending', async () => {
    const fetchMock = mockApi({ ...guest, [CHAT]: (init) => reply(body(init)) })
    renderApp('/chat')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.suggest2'] }))
    expect(input()).toHaveValue(STRINGS.en['chat.suggest2'])
    expect(input()).toHaveFocus()
    expect(callsTo(fetchMock, 'POST', '/api/v1/chat')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    await screen.findByText('Rest and drink water.')
    expect(screen.queryByRole('button', { name: STRINGS.en['chat.suggest2'] })).not.toBeInTheDocument()
  })

  it('shows suggestions and the Enter hint in Tamil', () => {
    renderApp('/chat', 'ta')
    expect(screen.getByRole('button', { name: STRINGS.ta['chat.suggest1'] })).toBeInTheDocument()
    expect(screen.getByLabelText(STRINGS.ta['chat.placeholder'])).toHaveAccessibleDescription(STRINGS.ta['chat.enterHint'])
  })

  it('shows reply headings as headings inside the answer', async () => {
    mockApi({ ...guest, [CHAT]: (init) => reply(body(init), '## What you can do\n- Rest') })
    renderApp('/chat')
    typeText('hello')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['chat.send'] }))
    const assistant = await screen.findByRole('article', { name: STRINGS.en['chat.assistant'] })
    expect(within(assistant).getByRole('heading', { name: 'What you can do' })).toBeInTheDocument()
    expect(assistant).not.toHaveTextContent('##')
  })
})
