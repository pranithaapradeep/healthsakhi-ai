import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AssessmentRequest } from '../api/assessment'
import { STRINGS } from '../i18n/strings'
import { callsTo, mockApi } from '../test/mockApi'
import { renderApp } from '../test/renderApp'

const en = STRINGS.en
const guest = { 'GET /api/v1/auth/me': { status: 401 } }
const SAFE = { 'POST /api/v1/safety/check': { status: 200, body: { level: 'none', categories: [], rule_ids: [] } } }
const ASSESS = 'POST /api/v1/assessment'
const COMPLETE = {
  status: 'complete',
  language: 'en',
  safety: { level: 'none', categories: [], rule_ids: [] },
  follow_up_questions: [],
  result: {
    urgency: 'routine',
    urgency_source: 'ai',
    summary: 'You have had a mild headache for two days.',
    possible_explanations: ['This could be a tension headache.'],
    self_care: ['Rest in a quiet room.'],
    seek_care_if: ['It becomes sudden or severe.'],
    recommended_next_step: 'See a doctor if it does not improve in a few days.',
  },
}
const body = (init: RequestInit) => JSON.parse(String(init.body)) as AssessmentRequest

function goToSymptoms() {
  fireEvent.click(screen.getByRole('button', { name: en['assessment.noneApply'] }))
}
function fillSymptoms(text = 'I have had a headache for two days.') {
  fireEvent.change(screen.getByLabelText(new RegExp(en['assessment.symptomsLabel'].replace('?', '\\?'))), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: en['assessment.next'] }))
}
async function fillDetails() {
  await screen.findByText(en['assessment.durationLabel'])
  fireEvent.click(screen.getByLabelText(en['duration.1_3d']))
  fireEvent.click(screen.getByLabelText(en['severity.mild']))
  fireEvent.click(screen.getByLabelText(en['trend.same']))
  fireEvent.click(screen.getByLabelText(en['age.adult']))
  fireEvent.click(screen.getByRole('button', { name: en['assessment.submit'] }))
}

describe('symptom checker', () => {
  it('asks about emergency signs first', () => {
    mockApi(guest)
    renderApp('/assessment')
    expect(screen.getByRole('heading', { name: en['assessment.redFlagsTitle'] })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(10)
  })

  it('shows emergency guidance immediately for a ticked red flag, without calling the AI', async () => {
    const fetchMock = mockApi(guest)
    renderApp('/assessment')
    fireEvent.click(screen.getByLabelText(en['flag.chest_pain']))
    fireEvent.click(screen.getByRole('button', { name: en['assessment.showEmergency'] }))

    const alert = screen.getByRole('alert')
    expect(within(alert).getByRole('heading', { name: en['urgency.emergency.title'] })).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: en['emergency.call'] })).toHaveAttribute('href', 'tel:112')
    expect(within(alert).getByText(en['flag.chest_pain'])).toBeInTheDocument()
    expect(within(alert).getByText(en['emergency.rulesNote'])).toBeInTheDocument()
    expect(callsTo(fetchMock, 'POST', '/api/v1/assessment')).toHaveLength(0)
    expect(callsTo(fetchMock, 'POST', '/api/v1/safety/check')).toHaveLength(0)
  })

  it('adds Tele-MANAS for self-harm', () => {
    mockApi(guest)
    renderApp('/assessment')
    fireEvent.click(screen.getByLabelText(en['flag.self_harm']))
    fireEvent.click(screen.getByRole('button', { name: en['assessment.showEmergency'] }))
    expect(screen.getByRole('link', { name: en['emergency.callTeleManas'] })).toHaveAttribute('href', 'tel:14416')
  })

  it('switches to emergency guidance when typed symptoms match an emergency rule', async () => {
    const fetchMock = mockApi({
      ...guest,
      'POST /api/v1/safety/check': { status: 200, body: { level: 'emergency', categories: ['stroke'], rule_ids: ['stroke_signs'] } },
    })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms('My father suddenly cannot lift his arm')
    expect(await screen.findByRole('heading', { name: en['urgency.emergency.title'] })).toBeInTheDocument()
    expect(screen.getByText(en['flag.stroke'])).toBeInTheDocument()
    expect(callsTo(fetchMock, 'POST', '/api/v1/assessment')).toHaveLength(0)
  })

  it('completes an ordinary assessment and shows a clear, non-diagnostic result', async () => {
    const fetchMock = mockApi({ ...guest, ...SAFE, [ASSESS]: { status: 200, body: COMPLETE } })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()

    expect(await screen.findByRole('heading', { name: en['urgency.routine.title'] })).toBeInTheDocument()
    expect(screen.getByText(COMPLETE.result.summary)).toBeInTheDocument()
    expect(screen.getByText(en['assessment.possible'])).toBeInTheDocument()
    expect(screen.getByText('This could be a tension headache.')).toBeInTheDocument()
    expect(screen.getByText(COMPLETE.result.recommended_next_step)).toBeInTheDocument()
    expect(screen.getByText(en['assessment.disclaimer'])).toBeInTheDocument()

    const [[, init]] = callsTo(fetchMock, 'POST', '/api/v1/assessment')
    expect(body(init as RequestInit)).toEqual({
      language: 'en',
      red_flags: [],
      symptoms: 'I have had a headache for two days.',
      other_symptoms: '',
      duration: '1_3d',
      severity: 'mild',
      trend: 'same',
      age_group: 'adult',
      pregnant: 'not_applicable',
      followups: [],
    })
  })

  it('asks follow-up questions and sends the answers', async () => {
    let call = 0
    const fetchMock = mockApi({
      ...guest,
      ...SAFE,
      [ASSESS]: () =>
        ++call === 1
          ? { status: 200, body: { ...COMPLETE, status: 'need_more_info', follow_up_questions: ['Do you have a fever?', 'Any vomiting?'], result: null } }
          : { status: 200, body: COMPLETE },
    })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()

    expect(await screen.findByRole('heading', { name: en['assessment.followupTitle'] })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Do you have a fever?'), { target: { value: 'No' } })
    fireEvent.click(screen.getByRole('button', { name: en['assessment.submit'] }))
    await screen.findByRole('heading', { name: en['urgency.routine.title'] })

    const calls = callsTo(fetchMock, 'POST', '/api/v1/assessment')
    expect(body(calls[1][1] as RequestInit).followups).toEqual([
      { question: 'Do you have a fever?', answer: 'No' },
      { question: 'Any vomiting?', answer: '' },
    ])
  })

  it('explains when fixed safety rules set the urgency', async () => {
    mockApi({
      ...guest,
      ...SAFE,
      [ASSESS]: {
        status: 200,
        body: {
          ...COMPLETE,
          safety: { level: 'urgent', categories: ['severe_or_worsening'], rule_ids: ['structured:severity'] },
          result: { ...COMPLETE.result, urgency: 'urgent', urgency_source: 'safety_rules' },
        },
      },
    })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()
    expect(await screen.findByRole('heading', { name: en['urgency.urgent.title'] })).toBeInTheDocument()
    expect(screen.getByText(en['reason.severe_or_worsening'])).toBeInTheDocument()
    expect(screen.getByText(en['assessment.rulesNote'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en['landing.findHospitals'] })).toHaveAttribute('href', '/hospitals')
  })

  it('shows full emergency guidance if the AI itself rates it an emergency', async () => {
    mockApi({ ...guest, ...SAFE, [ASSESS]: { status: 200, body: { ...COMPLETE, result: { ...COMPLETE.result, urgency: 'emergency' } } } })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()
    // Fixed emergency guidance plus the result card, both titled as an emergency.
    expect(await screen.findAllByRole('heading', { name: en['urgency.emergency.title'] })).toHaveLength(2)
    const alert = screen.getByRole('alert')
    expect(within(alert).getByRole('link', { name: en['emergency.call'] })).toHaveAttribute('href', 'tel:112')
  })

  it('validates required answers', async () => {
    mockApi({ ...guest, ...SAFE })
    renderApp('/assessment')
    goToSymptoms()
    fireEvent.click(screen.getByRole('button', { name: en['assessment.next'] }))
    expect(screen.getByText(en['assessment.required'])).toBeInTheDocument()

    fillSymptoms()
    await screen.findByText(en['assessment.durationLabel'])
    fireEvent.click(screen.getByRole('button', { name: en['assessment.submit'] }))
    expect(screen.getByText(en['assessment.chooseAll'])).toBeInTheDocument()
  })

  it('continues even if the quick safety check is unreachable', async () => {
    mockApi(guest) // safety check unmocked → network error
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    expect(await screen.findByText(en['assessment.durationLabel'])).toBeInTheDocument()
  })

  it('handles AI errors with retry where useful', async () => {
    let call = 0
    mockApi({ ...guest, ...SAFE, [ASSESS]: () => (++call === 1 ? { status: 504, body: { detail: 'ai_timeout' } } : { status: 200, body: COMPLETE }) })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()
    expect(await screen.findByText(en['chat.errorTimeout'])).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: en['common.retry'] }))
    expect(await screen.findByText(COMPLETE.result.summary)).toBeInTheDocument()
  })

  it('does not offer retry when the AI is not configured', async () => {
    mockApi({ ...guest, ...SAFE, [ASSESS]: { status: 503, body: { detail: 'ai_not_configured' } } })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()
    expect(await screen.findByText(en['chat.errorNotConfigured'])).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en['common.retry'] })).not.toBeInTheDocument()
  })

  it('works in Tamil and sends the selected language', async () => {
    const ta = STRINGS.ta
    const fetchMock = mockApi({ ...guest, ...SAFE, [ASSESS]: { status: 200, body: { ...COMPLETE, language: 'ta' } } })
    renderApp('/assessment', 'ta')
    expect(screen.getByRole('heading', { name: ta['assessment.redFlagsTitle'] })).toBeInTheDocument()
    expect(screen.getByText(ta['flag.stroke'])).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: ta['assessment.noneApply'] }))
    fireEvent.change(screen.getByLabelText(new RegExp(ta['assessment.symptomsLabel'].replace('?', '\\?'))), {
      target: { value: 'எனக்கு இரண்டு நாட்களாக தலைவலி இருக்கிறது.' },
    })
    fireEvent.click(screen.getByRole('button', { name: ta['assessment.next'] }))
    await screen.findByText(ta['assessment.durationLabel'])
    fireEvent.click(screen.getByLabelText(ta['duration.1_3d']))
    fireEvent.click(screen.getByLabelText(ta['severity.mild']))
    fireEvent.click(screen.getByLabelText(ta['trend.same']))
    fireEvent.click(screen.getByLabelText(ta['age.adult']))
    fireEvent.click(screen.getByRole('button', { name: ta['assessment.submit'] }))
    await screen.findByRole('heading', { name: ta['urgency.routine.title'] })
    const [[, init]] = callsTo(fetchMock, 'POST', '/api/v1/assessment')
    expect(body(init as RequestInit).language).toBe('ta')
  })

  it('asks about pregnancy only for children and adults, and sends the answer', async () => {
    const fetchMock = mockApi({ ...guest, ...SAFE, [ASSESS]: { status: 200, body: COMPLETE } })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await screen.findByText(en['assessment.durationLabel'])
    fireEvent.click(screen.getByLabelText(en['age.older_adult']))
    expect(screen.queryByText(en['assessment.pregnantLabel'])).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(en['age.adult']))
    fireEvent.click(screen.getByLabelText(en['pregnant.yes']))
    fireEvent.click(screen.getByLabelText(en['duration.1_3d']))
    fireEvent.click(screen.getByLabelText(en['severity.mild']))
    fireEvent.click(screen.getByLabelText(en['trend.same']))
    fireEvent.click(screen.getByRole('button', { name: en['assessment.submit'] }))
    await waitFor(() => expect(callsTo(fetchMock, 'POST', '/api/v1/assessment')).toHaveLength(1))
    expect(body(callsTo(fetchMock, 'POST', '/api/v1/assessment')[0][1] as RequestInit).pregnant).toBe('yes')
  })

  it('starts a new assessment', async () => {
    mockApi({ ...guest, ...SAFE, [ASSESS]: { status: 200, body: COMPLETE } })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()
    fireEvent.click(await screen.findByRole('button', { name: en['assessment.new'] }))
    expect(screen.getByRole('heading', { name: en['assessment.redFlagsTitle'] })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox').every((c) => !(c as HTMLInputElement).checked)).toBe(true)
  })

  // Regression (2026-10-25): real Groq follow-up replies used urgency "" and every such check failed.
  it('None of these → typed symptoms → follow-up questions → result (the path that used to fail)', async () => {
    let call = 0
    const fetchMock = mockApi({
      ...guest,
      ...SAFE,
      [ASSESS]: () =>
        ++call === 1
          ? {
              status: 200,
              body: {
                status: 'need_more_info',
                language: 'en',
                safety: { level: 'none', categories: [], rule_ids: [] },
                follow_up_questions: ['Do you have a fever?'],
                result: null,
              },
            }
          : { status: 200, body: COMPLETE },
    })
    renderApp('/assessment')
    fireEvent.click(screen.getByRole('button', { name: en['assessment.noneApply'] }))
    fillSymptoms('mild headache since yesterday')
    await fillDetails()
    expect(await screen.findByRole('heading', { name: en['assessment.followupTitle'] })).toBeInTheDocument()
    const first = body(callsTo(fetchMock, 'POST', '/api/v1/assessment')[0][1] as RequestInit)
    expect(first.red_flags).toEqual([])
    expect(first.symptoms).toBe('mild headache since yesterday')
    expect(first.pregnant).toBe('not_applicable')
    fireEvent.click(screen.getByRole('button', { name: en['assessment.submit'] }))
    expect(await screen.findByRole('heading', { name: en['urgency.routine.title'] })).toBeInTheDocument()
  })

  it('shows a specific, retryable message when the AI answer could not be used', async () => {
    let call = 0
    mockApi({ ...guest, ...SAFE, [ASSESS]: () => (++call === 1 ? { status: 502, body: { detail: 'ai_bad_response' } } : { status: 200, body: COMPLETE }) })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()
    expect(await screen.findByText(en['chat.errorBadResponse'])).toBeInTheDocument()
    expect(screen.queryByText(en['chat.errorUnavailable'])).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: en['common.retry'] }))
    expect(await screen.findByText(COMPLETE.result.summary)).toBeInTheDocument()
  })
})

describe('symptom check layout', () => {
  it('shows which step you are on, and marks the symptoms box when it is empty', async () => {
    mockApi({ ...guest, ...SAFE })
    renderApp('/assessment')
    expect(screen.getByText(en['assessment.stepRedFlags'])).toBeInTheDocument()
    goToSymptoms()
    expect(screen.getByText(en['assessment.stepSymptoms'])).toBeInTheDocument()
    const box = screen.getByLabelText(new RegExp(en['assessment.symptomsLabel'].replace('?', '\\?')))
    expect(box).not.toHaveAttribute('aria-invalid')
    fireEvent.click(screen.getByRole('button', { name: en['assessment.next'] }))
    expect(box).toHaveAttribute('aria-invalid', 'true')
  })

  it('keeps answer choices as real, keyboard-usable radio buttons', async () => {
    mockApi({ ...guest, ...SAFE })
    renderApp('/assessment')
    goToSymptoms()
    fireEvent.change(screen.getByLabelText(new RegExp(en['assessment.symptomsLabel'].replace('?', '\\?'))), { target: { value: 'headache' } })
    fireEvent.click(screen.getByRole('button', { name: en['assessment.next'] }))
    await screen.findByText(en['assessment.durationLabel'])
    const group = screen.getByRole('group', { name: en['assessment.severityLabel'] })
    const radios = within(group).getAllByRole('radio')
    expect(radios.length).toBeGreaterThan(1)
    radios[0].focus()
    expect(radios[0]).toHaveFocus()
    fireEvent.click(radios[0])
    expect(radios[0]).toBeChecked()
  })
})

describe('symptom check answers reach the request', () => {
  it('sends every typed follow-up answer, including edits and Tamil text', async () => {
    let call = 0
    const fetchMock = mockApi({
      ...guest,
      ...SAFE,
      [ASSESS]: () =>
        ++call === 1
          ? { status: 200, body: { ...COMPLETE, status: 'need_more_info', follow_up_questions: ['Do you have a fever?', 'Any vomiting?'], result: null } }
          : { status: 200, body: COMPLETE },
    })
    renderApp('/assessment')
    goToSymptoms()
    fillSymptoms()
    await fillDetails()
    await screen.findByRole('heading', { name: en['assessment.followupTitle'] })

    const fever = screen.getByLabelText('Do you have a fever?')
    const vomiting = screen.getByLabelText('Any vomiting?')
    fireEvent.change(fever, { target: { value: 'Yes' } })
    fireEvent.change(fever, { target: { value: 'No' } }) // changed their mind
    fireEvent.change(vomiting, { target: { value: 'இல்லை' } })
    expect(fever).toHaveValue('No')
    expect(vomiting).toHaveValue('இல்லை')
    fireEvent.click(screen.getByRole('button', { name: en['assessment.submit'] }))
    await screen.findByRole('heading', { name: en['urgency.routine.title'] })

    const calls = callsTo(fetchMock, 'POST', '/api/v1/assessment')
    expect(body(calls[1][1] as RequestInit).followups).toEqual([
      { question: 'Do you have a fever?', answer: 'No' },
      { question: 'Any vomiting?', answer: 'இல்லை' },
    ])
  })

  it('keeps ticked emergency signs in step with the checkboxes', () => {
    mockApi({ ...guest })
    renderApp('/assessment')
    const chest = screen.getByLabelText(en['flag.chest_pain'])
    fireEvent.click(chest)
    fireEvent.click(chest) // unticked again
    expect(chest).not.toBeChecked()
    expect(screen.queryByRole('button', { name: en['assessment.showEmergency'] })).toBeNull()
    fireEvent.click(screen.getByLabelText(en['flag.stroke']))
    fireEvent.click(screen.getByRole('button', { name: en['assessment.showEmergency'] }))
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(en['flag.stroke'])).toBeInTheDocument()
    expect(within(alert).queryByText(en['flag.chest_pain'])).toBeNull()
  })
})
