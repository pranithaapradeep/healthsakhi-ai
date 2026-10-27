import { ArrowLeft, ArrowRight, Info, MapPin, MessageCircle, RotateCw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  AGE_GROUPS,
  DURATIONS,
  MAX_ANSWER,
  MAX_OTHER,
  MAX_SYMPTOMS,
  PREGNANCY,
  SEVERITIES,
  TRENDS,
  assessmentErrorKey,
  submitAssessment,
  type AgeGroup,
  type AssessmentRequest,
  type AssessmentResponse,
  type Duration,
  type Pregnancy,
  type Severity,
  type Trend,
} from '../api/assessment'
import { NON_RETRYABLE } from '../api/chat'
import { RED_FLAGS, checkSafety, type RedFlag } from '../api/safety'
import AssessmentResultView from '../components/assessment/AssessmentResultView'
import ChoiceGroup from '../components/assessment/ChoiceGroup'
import EmergencyGuidance from '../components/safety/EmergencyGuidance'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import LanguageSelector from '../components/layout/LanguageSelector'
import { useLanguage } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

type Step = 'flags' | 'symptoms' | 'details' | 'checking' | 'followup' | 'result' | 'emergency'

const fieldClass =
  'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-base leading-relaxed text-ink placeholder:text-slate-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100 focus-visible:outline-none'
const fieldBorder = (invalid: boolean) => (invalid ? 'border-red-400' : 'border-line hover:border-forest-300')
// Each step is a plain white panel with a hairline border; the heading carries the question.
const panelClass = 'rounded-xl border border-line bg-white p-5 sm:p-7'
const questionClass = 'text-2xl font-semibold leading-snug text-ink outline-none'
const actionsClass = 'flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between'

export default function AssessmentPage() {
  const { t, lang } = useLanguage()
  const [step, setStep] = useState<Step>('flags')
  const [flags, setFlags] = useState<RedFlag[]>([])
  const [symptoms, setSymptoms] = useState('')
  const [other, setOther] = useState('')
  const [duration, setDuration] = useState<Duration | null>(null)
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [trend, setTrend] = useState<Trend | null>(null)
  const [age, setAge] = useState<AgeGroup | null>(null)
  const [pregnant, setPregnant] = useState<Pregnancy>('not_applicable')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [response, setResponse] = useState<AssessmentResponse | null>(null)
  const [emergencyCategories, setEmergencyCategories] = useState<string[]>([])
  const [formError, setFormError] = useState<StringKey | null>(null)
  const [requestError, setRequestError] = useState<{ key: StringKey; request: AssessmentRequest; back: Step } | null>(null)
  const [checkingSymptoms, setCheckingSymptoms] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const ids = { symptoms: useId(), other: useId() }

  useEffect(() => () => abortRef.current?.abort(), [])
  // Move focus to the step heading so screen-reader and keyboard users know the page changed.
  useEffect(() => headingRef.current?.focus(), [step])

  function showEmergency(categories: string[]) {
    abortRef.current?.abort()
    setEmergencyCategories(categories)
    setStep('emergency')
  }

  function reset() {
    abortRef.current?.abort()
    setStep('flags')
    setFlags([])
    setSymptoms('')
    setOther('')
    setDuration(null)
    setSeverity(null)
    setTrend(null)
    setAge(null)
    setPregnant('not_applicable')
    setQuestions([])
    setAnswers([])
    setResponse(null)
    setEmergencyCategories([])
    setFormError(null)
    setRequestError(null)
  }

  async function continueFromSymptoms() {
    if (!symptoms.trim()) {
      setFormError('assessment.required')
      return
    }
    setFormError(null)
    setCheckingSymptoms(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      // Fast rule check (no AI). If it fails we simply continue; the server checks again on submit.
      const safety = await checkSafety(`${symptoms}\n${other}`, lang, ctrl.signal)
      if (safety.level === 'emergency') {
        showEmergency(safety.categories)
        return
      }
    } catch {
      /* not blocking */
    } finally {
      setCheckingSymptoms(false)
    }
    if (!ctrl.signal.aborted) setStep('details')
  }

  function buildRequest(followups: AssessmentRequest['followups'] = []): AssessmentRequest | null {
    if (!duration || !severity || !trend || !age) return null
    return {
      language: lang,
      red_flags: flags,
      symptoms: symptoms.trim(),
      other_symptoms: other.trim(),
      duration,
      severity,
      trend,
      age_group: age,
      pregnant: age === 'infant' || age === 'older_adult' ? 'not_applicable' : pregnant,
      followups,
    }
  }

  async function send(request: AssessmentRequest, back: Step) {
    setRequestError(null)
    setStep('checking')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await submitAssessment(request, ctrl.signal)
      setResponse(res)
      if (res.status === 'emergency') {
        showEmergency(res.safety.categories)
      } else if (res.status === 'need_more_info') {
        setQuestions(res.follow_up_questions)
        setAnswers(res.follow_up_questions.map(() => ''))
        setStep('followup')
      } else {
        setStep('result')
      }
    } catch (err) {
      if (ctrl.signal.aborted) return
      setRequestError({ key: assessmentErrorKey(err), request, back })
      setStep(back)
    }
  }

  function submitDetails() {
    const request = buildRequest()
    if (!request) {
      setFormError('assessment.chooseAll')
      return
    }
    setFormError(null)
    void send(request, 'details')
  }

  function submitFollowups() {
    const request = buildRequest(questions.map((q, i) => ({ question: q.slice(0, MAX_ANSWER), answer: (answers[i] ?? '').trim() })))
    if (request) void send(request, 'followup')
  }

  const stepLabel: Partial<Record<Step, StringKey>> = {
    flags: 'assessment.stepRedFlags',
    symptoms: 'assessment.stepSymptoms',
    details: 'assessment.stepDetails',
  }
  // The three question steps, for the progress bar (the text label above it says the same, e.g. "Step 2 of 3").
  const stepNumber = ({ flags: 1, symptoms: 2, details: 3 } as Partial<Record<Step, number>>)[step]
  const missing = formError === 'assessment.chooseAll'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('assessment.title')} subtitle={t('assessment.intro')} actions={<LanguageSelector />} />

      {requestError && (
        <Alert
          tone="warning"
          title={t(requestError.key)}
          action={
            !NON_RETRYABLE.has(requestError.key) ? (
              <Button variant="secondary" onClick={() => void send(requestError.request, requestError.back)} icon={<RotateCw className="size-4" aria-hidden />}>
                {t('common.retry')}
              </Button>
            ) : undefined
          }
        />
      )}

      {stepLabel[step] && stepNumber && (
        <div>
          <p className="text-sm font-semibold text-forest-800">{t(stepLabel[step]!)}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-1.5 rounded-full ${n <= stepNumber ? 'bg-forest-700' : 'bg-sage-200'}`} />
            ))}
          </div>
        </div>
      )}

      {step === 'flags' && (
        <div className={`${panelClass} space-y-5`}>
          <div>
            <h2 ref={headingRef} tabIndex={-1} className={questionClass}>{t('assessment.redFlagsTitle')}</h2>
            <p className="mt-2 leading-relaxed text-slate-600">{t('assessment.redFlagsHint')}</p>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {RED_FLAGS.map((f) => {
              const on = flags.includes(f)
              return (
                <label
                  key={f}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border-l-4 px-4 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-forest-700 ${
                    on ? 'border-l-red-600 bg-red-50 font-medium text-red-950' : 'border-l-transparent bg-white text-slate-800 hover:bg-sage-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => {
                      // Read the box now: React may run the updater later, after it resets the input.
                      const checked = e.target.checked
                      setFlags((cur) => (checked ? (cur.includes(f) ? cur : [...cur, f]) : cur.filter((x) => x !== f)))
                    }}
                    className="size-[1.125rem] shrink-0 accent-red-700 focus-visible:outline-none"
                  />
                  <span>{t(`flag.${f}`)}</span>
                </label>
              )
            })}
          </div>
          <div className="border-t border-line pt-5">
            {flags.length > 0 ? (
              <Button variant="danger" className="w-full sm:w-auto" onClick={() => showEmergency(flags)}>{t('assessment.showEmergency')}</Button>
            ) : (
              <Button className="w-full sm:w-auto" onClick={() => setStep('symptoms')} icon={<ArrowRight className="size-4" aria-hidden />}>
                {t('assessment.noneApply')}
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 'symptoms' && (
        <div className={`${panelClass} space-y-6`}>
          <h2 ref={headingRef} tabIndex={-1} className="sr-only">{t('assessment.symptomsLabel')}</h2>
          <div className="space-y-3">
            <label htmlFor={ids.symptoms} className="block">
              <span className={`block ${questionClass}`}>{t('assessment.symptomsLabel')}</span>
              <span className="mt-1.5 block leading-relaxed text-slate-600">{t('assessment.symptomsHint')}</span>
            </label>
            <textarea
              id={ids.symptoms}
              rows={4}
              maxLength={MAX_SYMPTOMS}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              lang={lang}
              aria-invalid={formError === 'assessment.required' || undefined}
              className={`${fieldClass} ${fieldBorder(formError === 'assessment.required')}`}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={ids.other} className="block font-semibold text-ink">{t('assessment.otherLabel')}</label>
            <textarea id={ids.other} rows={2} maxLength={MAX_OTHER} value={other} onChange={(e) => setOther(e.target.value)} lang={lang} className={`${fieldClass} ${fieldBorder(false)}`} />
          </div>
          {formError && <Alert tone="danger">{t(formError)}</Alert>}
          <div className={actionsClass}>
            <Button variant="ghost" onClick={() => setStep('flags')} icon={<ArrowLeft className="size-4" aria-hidden />}>{t('assessment.back')}</Button>
            <Button onClick={() => void continueFromSymptoms()} loading={checkingSymptoms}>{t('assessment.next')}</Button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className={`${panelClass} space-y-8`}>
          <h2 ref={headingRef} tabIndex={-1} className="sr-only">{t('assessment.stepDetails')}</h2>
          <ChoiceGroup name="duration" legend={t('assessment.durationLabel')} options={DURATIONS} value={duration} onChange={setDuration} labelFor={(v) => t(`duration.${v}`)} invalid={missing && !duration} />
          <ChoiceGroup name="severity" legend={t('assessment.severityLabel')} options={SEVERITIES} value={severity} onChange={setSeverity} labelFor={(v) => t(`severity.${v}`)} invalid={missing && !severity} />
          <ChoiceGroup name="trend" legend={t('assessment.trendLabel')} options={TRENDS} value={trend} onChange={setTrend} labelFor={(v) => t(`trend.${v}`)} invalid={missing && !trend} />
          <ChoiceGroup name="age" legend={t('assessment.ageLabel')} options={AGE_GROUPS} value={age} onChange={setAge} labelFor={(v) => t(`age.${v}`)} invalid={missing && !age} />
          {(age === 'child' || age === 'adult') && (
            <ChoiceGroup
              name="pregnant"
              legend={t('assessment.pregnantLabel')}
              options={PREGNANCY}
              value={pregnant === 'not_applicable' ? null : pregnant}
              onChange={setPregnant}
              labelFor={(v) => t(`pregnant.${v}`)}
            />
          )}
          {formError && <Alert tone="danger">{t(formError)}</Alert>}
          <div className={actionsClass}>
            <Button variant="ghost" onClick={() => setStep('symptoms')} icon={<ArrowLeft className="size-4" aria-hidden />}>{t('assessment.back')}</Button>
            <Button onClick={submitDetails}>{t('assessment.submit')}</Button>
          </div>
        </div>
      )}

      {step === 'checking' && (
        <div className={`${panelClass} flex min-h-40 items-center justify-center`}>
          <h2 ref={headingRef} tabIndex={-1} className="sr-only">{t('assessment.checking')}</h2>
          <Spinner label={t('assessment.checking')} />
        </div>
      )}

      {step === 'followup' && (
        <div className={`${panelClass} space-y-6`}>
          <div>
            <h2 ref={headingRef} tabIndex={-1} className={questionClass}>{t('assessment.followupTitle')}</h2>
            <p className="mt-2 leading-relaxed text-slate-600">{t('assessment.followupHint')}</p>
          </div>
          <ol className="space-y-5">
            {questions.map((q, i) => (
              <li key={i}>
                <label className="block font-semibold leading-snug text-ink">
                  {q}
                  <input
                    value={answers[i] ?? ''}
                    maxLength={MAX_ANSWER}
                    onChange={(e) => {
                      // Read the text now: React may run the updater later, after it has reset this controlled
                      // input to the old value — reading e.target.value inside the updater could then send "".
                      const text = e.target.value
                      setAnswers((a) => a.map((x, j) => (j === i ? text : x)))
                    }}
                    lang={lang}
                    className={`mt-2 min-h-12 font-normal ${fieldClass} ${fieldBorder(false)}`}
                  />
                </label>
              </li>
            ))}
          </ol>
          <div className={actionsClass}>
            <Button variant="ghost" onClick={reset}>{t('assessment.new')}</Button>
            <Button onClick={submitFollowups}>{t('assessment.submit')}</Button>
          </div>
        </div>
      )}

      {step === 'emergency' && (
        <div className="space-y-4">
          {/* EmergencyGuidance is role="alert", so it is announced immediately. */}
          <EmergencyGuidance categories={emergencyCategories} />
          <Button variant="secondary" onClick={reset}>{t('assessment.new')}</Button>
        </div>
      )}

      {step === 'result' && response?.result && (
        <div className="space-y-4">
          <h2 ref={headingRef} tabIndex={-1} className={questionClass}>{t('assessment.resultTitle')}</h2>
          <AssessmentResultView result={response.result} safetyCategories={response.safety.categories} />
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            {response.result.urgency !== 'routine' && (
              <Link to="/hospitals" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest-800 px-4 text-sm font-semibold text-white hover:bg-forest-900">
                <MapPin className="size-4" aria-hidden />
                {t('landing.findHospitals')}
              </Link>
            )}
            <Link to="/chat" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-forest-900 ring-1 ring-inset ring-line hover:bg-sage-50 hover:ring-forest-300">
              <MessageCircle className="size-4" aria-hidden />
              {t('assessment.askChat')}
            </Link>
            <Button variant="secondary" onClick={reset}>{t('assessment.new')}</Button>
          </div>
        </div>
      )}

      <p className="flex items-start gap-2.5 border-t border-line pt-5 text-sm leading-relaxed text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
        {t('assessment.disclaimer')}
      </p>
    </div>
  )
}
