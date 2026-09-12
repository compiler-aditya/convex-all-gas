import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { TEMPLATES, requireTemplate } from '../../convex/templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Labelled, PageShell } from './PageShell'

/**
 * Start a negotiation.
 *
 * Three things on one page rather than a wizard: what this is about, who the
 * two sides are, and which side you are. Limits come next, on their own screen,
 * because that screen has to earn a number the user has refused to say aloud.
 */

/** Templates on the roadmap, named so the shape of the product is visible. */
const UPCOMING = ['Sublets and rentals', 'Used goods', 'Group trip costs']

/**
 * A selectable card.
 *
 * The native control stays in the markup and does the work — keyboard, arrow
 * keys within the group, form value — but is visually replaced, because a
 * browser's default radio is system blue and there is no blue anywhere in this
 * product.
 */
function Choice({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
}: {
  name: string
  value: string
  checked: boolean
  onSelect: () => void
  title: string
  description?: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-offset-2 ${
        checked
          ? 'border-primary bg-accent'
          : 'border-border bg-card hover:border-muted-foreground'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors ${
          checked ? 'border-primary' : 'border-muted-foreground'
        }`}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        {description !== undefined && (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        )}
      </span>
    </label>
  )
}

function Section({
  legend,
  hint,
  children,
}: {
  legend: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-3">{children}</div>
    </fieldset>
  )
}

export function CreateRoomRoute() {
  const navigate = useNavigate()
  const createRoom = useMutation(api.rooms.createRoom)

  const [templateId, setTemplateId] = useState('freelance')
  const [creatorSide, setCreatorSide] = useState<'a' | 'b'>('a')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const template = requireTemplate(templateId)
  const liveTemplates = Object.values(TEMPLATES)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const contextUrl = String(form.get('contextUrl') ?? '').trim()
      const { roomId, joinToken } = await createRoom({
        templateId,
        title: String(form.get('title') ?? '').trim(),
        contextUrl: contextUrl.length > 0 ? contextUrl : undefined,
        creatorName: String(form.get('creatorName') ?? '').trim(),
        counterpartyName: String(form.get('counterpartyName') ?? '').trim(),
        creatorSide,
      })
      // The raw token is returned exactly once. Carry it to the next screen so
      // the invite link can be shown without ever storing it.
      navigate(`/room/${roomId}/position?invite=${joinToken}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the room.')
      setSubmitting(false)
    }
  }

  return (
    <PageShell
      eyebrow="New negotiation"
      title="What are you negotiating?"
      intro="You will set your limits on the next screen. The other side joins by link and never creates an account."
    >
      <form onSubmit={handleSubmit} className="grid gap-8">
        <Section legend="Template" hint="Templates decide which terms are on the table.">
          <div className="grid gap-2">
            {liveTemplates.map((option) => (
              <Choice
                key={option.id}
                name="templateId"
                value={option.id}
                checked={templateId === option.id}
                onSelect={() => setTemplateId(option.id)}
                title={option.name}
                description={option.summary}
              />
            ))}
          </div>
          {/* Stated as one line rather than three greyed-out rows, which read
              as broken options instead of a roadmap. */}
          <p className="mt-3 text-xs text-muted-foreground">
            More coming: {UPCOMING.join(', ').toLowerCase()} — a template is only
            a set of terms, and the engine underneath is not specific to freelance work.
          </p>
        </Section>

        <div className="grid gap-5">
          <Labelled
            label="What is it about?"
            htmlFor="title"
            hint="A short description both of you will recognise."
          >
            <Input id="title" name="title" required placeholder="Customer dashboard, 4 screens" />
          </Labelled>

          <Labelled
            label="Link to the details"
            htmlFor="contextUrl"
            hint="Optional. A job post or listing, used to gather evidence both of you can see. Anything found there is shown to you both, and never sets anyone's limits."
          >
            <Input id="contextUrl" name="contextUrl" type="url" placeholder="https://" />
          </Labelled>

          <div className="grid gap-5 sm:grid-cols-2">
            <Labelled label="Your name" htmlFor="creatorName">
              <Input id="creatorName" name="creatorName" required autoComplete="name" />
            </Labelled>
            <Labelled label="Their name" htmlFor="counterpartyName">
              <Input id="counterpartyName" name="counterpartyName" required />
            </Labelled>
          </div>
        </div>

        <Section legend="Which side are you?" hint="This decides which way each term runs for you.">
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: 'a', label: template.sideALabel },
                { value: 'b', label: template.sideBLabel },
              ] as const
            ).map((option) => (
              <Choice
                key={option.value}
                name="creatorSide"
                value={option.value}
                checked={creatorSide === option.value}
                onSelect={() => setCreatorSide(option.value)}
                title={option.label}
              />
            ))}
          </div>
        </Section>

        {error !== null && (
          <p role="alert" className="text-sm text-no-deal">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Continue to your limits'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Nothing is sent to anyone yet — the next screen is private to you.
          </p>
        </div>
      </form>
    </PageShell>
  )
}
