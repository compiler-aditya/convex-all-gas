import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { requireTemplate } from '../../convex/templates'
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

  return (
    <PageShell
      eyebrow={room.title}
      title="Your position"
      intro={`You are the ${mySide === 'a' ? template.sideALabel : template.sideBLabel}. Leave a term blank if you have no view on it.`}
    >
      <form onSubmit={handleSubmit}>
        <div className="rounded-md border border-private-border bg-private-bg p-5">
          <p className="flex items-start gap-2 text-sm text-private">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Only you will ever see this.</strong>{' '}
              Your agent uses it; it is never sent to the other side.
            </span>
          </p>

          <div className="mt-5 grid gap-6">
            {template.dimensions.map((dimension) => {
              const draft = draftFor(dimension.key)
              const minimum = isMinimum(dimension)
              const inputId = `limit-${dimension.key}`

              return (
                <div key={dimension.key} className="grid gap-2 border-t border-private-border pt-5 first:border-t-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                      {dimension.label}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {minimum ? 'never below' : 'never above'}
                    </span>
                  </div>
                  {dimension.help !== undefined && (
                    <p className="text-xs text-muted-foreground">{dimension.help}</p>
                  )}

                  <div className="flex items-center gap-2">
                    {dimension.unit === '₹' && (
                      <span className="font-mono text-sm text-muted-foreground">₹</span>
                    )}
                    <Input
                      id={inputId}
                      inputMode="numeric"
                      value={draft.limit}
                      onChange={(event) => update(dimension.key, { limit: event.target.value })}
                      placeholder={minimum ? 'your minimum' : 'your maximum'}
                      className="max-w-[180px] text-right font-mono tabular-nums"
                    />
                    {dimension.unit !== undefined && dimension.unit !== '₹' && (
                      <span className="text-sm text-muted-foreground">{dimension.unit}</span>
                    )}
                  </div>

                  <div className="mt-1 grid gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      How much does this matter?
                    </span>
                    {/* Five discrete steps rather than a slider: a priority is a
                        judgement, not a continuous measurement. */}
                    <div role="radiogroup" aria-label={`Priority for ${dimension.label}`} className="flex gap-1">
                      {PRIORITIES.map((priority) => (
                        <button
                          key={priority.weight}
                          type="button"
                          role="radio"
                          aria-checked={draft.weight === priority.weight}
                          onClick={() => update(dimension.key, { weight: priority.weight })}
                          className={`flex-1 rounded-sm border px-2 py-1.5 text-xs transition-colors ${
                            draft.weight === priority.weight
                              ? 'border-private bg-private text-background'
                              : 'border-private-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {priority.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draft.isHard}
                      onChange={(event) => update(dimension.key, { isHard: event.target.checked })}
                    />
                    This one cannot move
                  </label>
                </div>
              )
            })}
          </div>
        </div>

        {error !== null && (
          <p role="alert" className="mt-4 text-sm text-no-deal">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Lock in my position'}
          </Button>
          <p className="text-xs text-muted-foreground">
            You cannot change these once the negotiation starts.
          </p>
        </div>
      </form>
    </PageShell>
  )
}
