import { useState } from 'react'
import { ArrowLeft, Check, LockKeyhole, Pencil } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { requireTemplate } from '../../convex/templates'
import type { Dimension } from '../../convex/templates/types'
import { formatFigure, formatValue } from '@/components/negotiation/model'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { questionFor } from './bounds-copy'
import { PageShell } from './PageShell'

/**
 * The private position.
 *
 * This is the one screen where a person types the number they have refused to
 * say out loud, so it is asked the way a person would ask it: one term at a
 * time, as a question in words, with the consequence stated underneath.
 *
 * A single scrolling form gave a floor and a revision count the same visual
 * weight, repeated "How much does this matter?" five times, and labelled the
 * input with a direction ("never below") that has to be decoded before it can
 * be answered. Asking one thing at a time costs a few clicks and buys a screen
 * where the question is unmissable and the answer is obviously consequential.
 *
 * Every term may be skipped. Most people only hold a firm view on one or two,
 * and a blank term is a real answer here — it means "no opinion", not zero.
 */

const PRIORITIES = [
  { weight: 0.2, label: 'Lowest' },
  { weight: 0.4, label: 'Low' },
  { weight: 0.6, label: 'Medium' },
  { weight: 0.8, label: 'High' },
  { weight: 1, label: 'Highest' },
] as const

type Draft = { limit: string; weight: number; isHard: boolean }

function parseLimit(raw: string): number | null {
  const value = Number(raw.replace(/[,\s]/g, ''))
  if (raw.trim() === '' || !Number.isFinite(value)) return null
  return value
}

export function BoundsRoute() {
  const { roomId } = useParams<{ roomId: string }>()
  const [search] = useSearchParams()
  const joinToken = search.get('t') ?? undefined
  const invite = search.get('invite') ?? undefined
  const navigate = useNavigate()

  const id = (roomId ?? null) as Id<'rooms'> | null
  const room = useQuery(api.rooms.getRoom, id === null ? 'skip' : { roomId: id, joinToken })
  const setMyBounds = useMutation(api.bounds.setMyBounds)

  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)

  if (id === null) return null
  if (room === undefined) {
    return (
      <PageShell title="Your position">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageShell>
    )
  }

  const template = requireTemplate(room.templateId)
  const dimensions = template.dimensions
  const mySide = room.mySide
  const reviewStep = dimensions.length

  /** Whether this side is protected by a floor or by a ceiling on a term. */
  const isMinimum = (dimension: Dimension) => dimension.higherFavors === mySide

  const draftFor = (key: string): Draft =>
    drafts[key] ?? { limit: '', weight: 0.6, isHard: false }

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [key]: { ...draftFor(key), ...patch } }))

  const setTerms = dimensions.filter((d) => parseLimit(draftFor(d.key).limit) !== null)

  function collectBounds() {
    return dimensions
      .map((dimension) => {
        const draft = draftFor(dimension.key)
        const value = parseLimit(draft.limit)
        // A term left blank is a term with no opinion, which is allowed. It is
        // simply not sent, rather than sent as zero.
        if (value === null) return null
        return {
          dimensionKey: dimension.key,
          ...(isMinimum(dimension) ? { min: value } : { max: value }),
          weight: draft.weight,
          isHard: draft.isHard,
        }
      })
      .filter((bound): bound is NonNullable<typeof bound> => bound !== null)
  }

  async function save() {
    setError(null)
    setSubmitting(true)
    const bounds = collectBounds()

    if (bounds.length === 0) {
      setError('Set a limit on at least one term, so your agent has something to hold.')
      setSubmitting(false)
      return
    }

    try {
      await setMyBounds({ roomId: id!, joinToken, bounds })
      if (invite !== undefined) {
        setSaved(true)
        setSubmitting(false)
        return
      }
      navigate(`/room/${roomId}${joinToken !== undefined ? `?t=${joinToken}` : ''}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your position.')
      setSubmitting(false)
    }
  }

  /** Advancing and saving share a handler; only the review step saves. */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < reviewStep) {
      setStep(step + 1)
      return
    }
    void save()
  }

  if (saved && invite !== undefined) {
    const link = `${window.location.origin}/room/${roomId}?t=${invite}`
    return (
      <PageShell
        eyebrow={room.title}
        title="Your position is locked in"
        intro={`Now invite ${room.counterpartyName ?? 'the other side'}. They set their own limits, which you will never see.`}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="invite-link" className="text-sm font-medium">
              Their private link
            </label>
            <div className="flex gap-2">
              <Input id="invite-link" readOnly value={link} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigator.clipboard?.writeText(link)}
              >
                Copy
              </Button>
            </div>
            {/* An invite is not an introduction. This product never contacts a
                stranger on the user's behalf. */}
            <p className="text-xs text-muted-foreground">
              Only send this to someone you are already dealing with. Anyone with
              the link can act as {room.counterpartyName ?? 'the other side'}.
            </p>
          </div>
          <div>
            <Button onClick={() => navigate(`/room/${roomId}`)}>Go to the room</Button>
          </div>
        </div>
      </PageShell>
    )
  }

  const onReview = step === reviewStep

  return (
    <PageShell
      eyebrow={room.title}
      title="Your position"
      intro={
        <span className="flex items-start gap-2 text-private">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Only you will ever see this.</strong>{' '}
            Your agent negotiates with it; it is never sent to{' '}
            {room.counterpartyName ?? 'the other side'}.
          </span>
        </span>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* One segment per term, so progress and what is still blank are both
            readable at a glance — and any term is one click away. */}
        <nav aria-label="Terms" className="flex gap-1.5">
          {dimensions.map((dimension, index) => {
            const isSet = parseLimit(draftFor(dimension.key).limit) !== null
            const current = index === step
            return (
              <button
                key={dimension.key}
                type="button"
                onClick={() => setStep(index)}
                aria-current={current ? 'step' : undefined}
                aria-label={`${dimension.label}${isSet ? ', set' : ', not set'}`}
                className="group flex-1 py-2"
              >
                <span
                  className={`block h-1 rounded-full transition-colors ${
                    isSet
                      ? 'bg-private'
                      : current
                        ? 'bg-private/40'
                        : 'bg-border group-hover:bg-private/30'
                  }`}
                />
              </button>
            )
          })}
        </nav>

        <div className="mt-4 rounded-xl border border-private-border bg-private-bg px-6 py-8 sm:px-8 sm:py-10">
          {onReview ? (
            <ReviewStep
              dimensions={dimensions}
              draftFor={draftFor}
              isMinimum={isMinimum}
              onEdit={setStep}
            />
          ) : (
            <TermStep
              dimension={dimensions[step]}
              index={step}
              total={dimensions.length}
              minimum={isMinimum(dimensions[step])}
              draft={draftFor(dimensions[step].key)}
              update={update}
              onAdvance={() => setStep(step + 1)}
            />
          )}
        </div>

        {error !== null && (
          <p role="alert" className="mt-4 text-sm text-no-deal">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
          )}

          {onReview ? (
            <>
              <Button type="submit" disabled={submitting || setTerms.length === 0}>
                {submitting ? 'Saving…' : 'Lock in my position'}
              </Button>
              <p className="text-xs text-muted-foreground">
                {setTerms.length === 0
                  ? 'Set at least one limit to continue.'
                  : 'You cannot change these once the negotiation starts.'}
              </p>
            </>
          ) : (
            <NextButton
              hasValue={parseLimit(draftFor(dimensions[step].key).limit) !== null}
              isLast={step === dimensions.length - 1}
            />
          )}
        </div>
      </form>
    </PageShell>
  )
}

/**
 * The primary action says what it will do with the field as it stands, so
 * leaving a term blank is an explicit choice rather than an omission.
 */
function NextButton({ hasValue, isLast }: { hasValue: boolean; isLast: boolean }) {
  return (
    <Button type="submit" variant={hasValue ? 'default' : 'outline'}>
      {hasValue ? (isLast ? 'Review' : 'Continue') : isLast ? 'Skip and review' : 'Skip this term'}
    </Button>
  )
}

function TermStep({
  dimension,
  index,
  total,
  minimum,
  draft,
  update,
  onAdvance,
}: {
  dimension: Dimension
  index: number
  total: number
  minimum: boolean
  draft: Draft
  update: (key: string, patch: Partial<Draft>) => void
  onAdvance: () => void
}) {
  const inputId = `limit-${dimension.key}`
  const hasValue = parseLimit(draft.limit) !== null
  const prefix = dimension.unit === '₹' ? '₹' : undefined
  const suffix =
    dimension.unit !== undefined && dimension.unit !== '₹' ? dimension.unit : undefined

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
        Term {index + 1} of {total} · {dimension.label}
      </p>

      <h2
        id={`${inputId}-question`}
        className="mt-3 text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[30px]"
      >
        {questionFor(dimension, minimum)}
      </h2>

      {dimension.help !== undefined && (
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">{dimension.help}</p>
      )}

      {/* Prefix, field and unit share one bordered box so the value reads as a
          single quantity rather than three adjacent controls. */}
      <div className="mt-6 flex h-14 max-w-sm items-center gap-2 rounded-lg border border-private-border bg-card px-4 transition-shadow focus-within:ring-2 focus-within:ring-private/40">
        {prefix !== undefined && (
          <span className="font-mono text-xl text-muted-foreground" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="off"
          value={draft.limit}
          onChange={(event) => update(dimension.key, { limit: event.target.value })}
          /* Grouped on blur rather than per keystroke: the same ₹1,45,000 the
             rest of the app shows, without the caret fighting the formatter
             mid-number. */
          onBlur={() => {
            if (dimension.type !== 'money') return
            const value = parseLimit(draft.limit)
            if (value === null) return
            update(dimension.key, { limit: formatFigure(value) })
          }}
          /* Advance on Enter explicitly. Implicit form submission stops being
             dependable once the step grows a second field, which it does as
             soon as a value is entered and the priority controls appear.
             Blurring first lets the money formatter run before the step moves. */
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            event.currentTarget.blur()
            onAdvance()
          }}
          placeholder="—"
          className="w-full min-w-0 bg-transparent font-mono text-2xl tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        {suffix !== undefined && (
          <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {hasValue
          ? `Your agent will never agree to ${minimum ? 'less' : 'more'} than this.`
          : `Leave it blank if you have no firm view — your agent will treat ${dimension.label.toLowerCase()} as open.`}
      </p>

      {/* Priority and the fixed toggle only mean something once a limit exists,
          so they stay out of the way until then. */}
      {hasValue && (
        <div className="mt-8 border-t border-private-border pt-6">
          <p className="text-sm font-medium text-foreground">
            If your agent has to give ground, how much does this one matter?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            It concedes what matters least first, to win what matters most.
          </p>

          <div
            role="radiogroup"
            aria-label={`How much ${dimension.label} matters`}
            className="mt-3 flex max-w-md overflow-hidden rounded-md border border-private-border bg-card"
          >
            {PRIORITIES.map((priority) => (
              <button
                key={priority.weight}
                type="button"
                role="radio"
                aria-checked={draft.weight === priority.weight}
                onClick={() => update(dimension.key, { weight: priority.weight })}
                className={`flex-1 border-r border-private-border px-2 py-2 text-xs transition-colors last:border-r-0 ${
                  draft.weight === priority.weight
                    ? 'bg-private/15 font-medium text-private'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {priority.label}
              </button>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.isHard}
              onChange={(event) => update(dimension.key, { isHard: event.target.checked })}
            />
            This one is fixed — never trade it away
          </label>
        </div>
      )}
    </div>
  )
}

/**
 * Everything in one place before it is locked in — the "all at once" view,
 * earned after the questions rather than instead of them.
 */
function ReviewStep({
  dimensions,
  draftFor,
  isMinimum,
  onEdit,
}: {
  dimensions: Dimension[]
  draftFor: (key: string) => Draft
  isMinimum: (dimension: Dimension) => boolean
  onEdit: (index: number) => void
}) {
  return (
    <div>
      <h2 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">
        This is what your agent will hold
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Check it over. Nothing has been saved yet.
      </p>

      <dl className="mt-6 divide-y divide-private-border border-y border-private-border">
        {dimensions.map((dimension, index) => {
          const draft = draftFor(dimension.key)
          const value = parseLimit(draft.limit)
          const minimum = isMinimum(dimension)
          const priority = PRIORITIES.find((p) => p.weight === draft.weight)

          return (
            <div key={dimension.key} className="flex items-baseline gap-4 py-3">
              <dt className="min-w-[8rem] flex-1 text-sm text-muted-foreground">
                {dimension.label}
              </dt>
              <dd className="flex items-baseline gap-3">
                {value === null ? (
                  <span className="text-sm text-muted-foreground/70">No view</span>
                ) : (
                  <span className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {minimum ? 'At least ' : 'Up to '}
                    </span>
                    <strong className="font-mono text-base font-medium tabular-nums text-foreground">
                      {formatValue(dimension, value)}
                    </strong>
                    <span className="block text-xs text-muted-foreground">
                      {priority?.label ?? 'Medium'} priority
                      {draft.isHard ? ' · fixed' : ''}
                    </span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(index)}
                  className="inline-flex items-center gap-1 text-xs text-private underline underline-offset-4"
                >
                  {value === null ? (
                    <>
                      <Check className="size-3" aria-hidden="true" />
                      Set
                    </>
                  ) : (
                    <>
                      <Pencil className="size-3" aria-hidden="true" />
                      Change
                    </>
                  )}
                  <span className="sr-only"> {dimension.label}</span>
                </button>
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
