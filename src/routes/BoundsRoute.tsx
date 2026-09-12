import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { requireTemplate } from '../../convex/templates'
import { formatFigure } from '@/components/negotiation/model'
import type { Dimension } from '../../convex/templates/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageShell } from './PageShell'

/**
 * The private position.
 *
 * The user is typing the number they have refused to say out loud. The screen
 * has to earn that: the promise is stated once, plainly, at the top, and the
 * whole form is visually marked as private so it is never mistaken for
 * something being sent.
 */

const PRIORITIES = [
  { weight: 0.2, label: 'Lowest' },
  { weight: 0.4, label: 'Low' },
  { weight: 0.6, label: 'Medium' },
  { weight: 0.8, label: 'High' },
  { weight: 1, label: 'Highest' },
] as const

type Draft = { limit: string; weight: number; isHard: boolean }

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
  const mySide = room.mySide

  /** Whether this side is protected by a floor or by a ceiling on a term. */
  const isMinimum = (dimension: Dimension) => dimension.higherFavors === mySide

  const draftFor = (key: string): Draft =>
    drafts[key] ?? { limit: '', weight: 0.6, isHard: false }

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [key]: { ...draftFor(key), ...patch } }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const bounds = template.dimensions
      .map((dimension) => {
        const draft = draftFor(dimension.key)
        const value = Number(draft.limit.replace(/[,\s]/g, ''))
        // A term left blank is a term with no opinion, which is allowed. It is
        // simply not sent, rather than sent as zero.
        if (draft.limit.trim() === '' || !Number.isFinite(value)) return null
        return {
          dimensionKey: dimension.key,
          ...(isMinimum(dimension) ? { min: value } : { max: value }),
          weight: draft.weight,
          isHard: draft.isHard,
        }
      })
      .filter((bound): bound is NonNullable<typeof bound> => bound !== null)

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

  const filled = template.dimensions.filter(
    (d) => draftFor(d.key).limit.trim() !== '',
  ).length

  return (
    <PageShell
      eyebrow={room.title}
      title="Your position"
      intro={`You are the ${mySide === 'a' ? template.sideALabel : template.sideBLabel}. Set a limit on what you care about and leave the rest blank — most people only have a firm view on one or two.`}
    >
      <form onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-md border border-private-border bg-private-bg">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-private-border px-5 py-3">
            <p className="flex items-center gap-2 text-sm text-private">
              <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Only you will ever see this.</strong>{' '}
                Never sent to the other side.
              </span>
            </p>
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              {filled} of {template.dimensions.length} set
            </p>
          </div>

          <div className="divide-y divide-private-border">
            {template.dimensions.map((dimension) => {
              const draft = draftFor(dimension.key)
              const minimum = isMinimum(dimension)
              const inputId = `limit-${dimension.key}`
              const hasValue = draft.limit.trim() !== ''

              return (
                <div
                  key={dimension.key}
                  /* Terms you have no view on recede rather than competing for
                     attention with the one or two you actually care about. */
                  className={`px-5 py-4 transition-opacity ${hasValue ? '' : 'opacity-70'}`}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-[9rem] flex-1">
                      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                        {dimension.label}
                      </label>
                      {dimension.help !== undefined && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{dimension.help}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                        {minimum ? 'never below' : 'never above'}
                      </span>
                      {/* Always rendered, so every input lines up in one column
                          whether or not its term carries a currency symbol. */}
                      <span
                        aria-hidden="true"
                        className="w-2 font-mono text-sm text-muted-foreground"
                      >
                        {dimension.unit === '₹' ? '₹' : ''}
                      </span>
                      <Input
                        id={inputId}
                        inputMode="numeric"
                        value={draft.limit}
                        onChange={(event) => update(dimension.key, { limit: event.target.value })}
                        /* Grouped on blur rather than per keystroke: the same
                           ₹1,45,000 the rest of the app shows, without the
                           caret fighting the formatter mid-number. */
                        onBlur={() => {
                          if (dimension.type !== 'money') return
                          const value = Number(draft.limit.replace(/[,\s]/g, ''))
                          if (draft.limit.trim() === '' || !Number.isFinite(value)) return
                          update(dimension.key, { limit: formatFigure(value) })
                        }}
                        placeholder="—"
                        className="w-28 text-right font-mono tabular-nums"
                      />
                      <span className="w-14 text-xs text-muted-foreground">
                        {dimension.unit !== undefined && dimension.unit !== '₹' ? dimension.unit : ''}
                      </span>
                    </div>
                  </div>

                  {/* Priority and the fixed toggle only matter once a limit
                      exists, so they stay out of the way until then. */}
                  {hasValue && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-0 sm:pl-[9rem]">
                      <div
                        role="radiogroup"
                        aria-label={`How much ${dimension.label} matters`}
                        className="flex overflow-hidden rounded-sm border border-private-border"
                      >
                        {PRIORITIES.map((priority) => (
                          <button
                            key={priority.weight}
                            type="button"
                            role="radio"
                            aria-checked={draft.weight === priority.weight}
                            onClick={() => update(dimension.key, { weight: priority.weight })}
                            className={`px-2.5 py-1 text-[11px] transition-colors ${
                              draft.weight === priority.weight
                                ? 'bg-private/15 font-medium text-private'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {priority.label}
                          </button>
                        ))}
                      </div>

                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={draft.isHard}
                          onChange={(event) =>
                            update(dimension.key, { isHard: event.target.checked })
                          }
                        />
                        cannot move
                      </label>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Priority tells your agent where to concede first. It gives ground on
          what matters least to win what matters most.
        </p>

        {error !== null && (
          <p role="alert" className="mt-4 text-sm text-no-deal">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={submitting || filled === 0}>
            {submitting ? 'Saving…' : 'Lock in my position'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {filled === 0
              ? 'Set at least one limit to continue.'
              : 'You cannot change these once the negotiation starts.'}
          </p>
        </div>
      </form>
    </PageShell>
  )
}
