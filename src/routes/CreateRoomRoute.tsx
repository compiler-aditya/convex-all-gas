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
export function CreateRoomRoute() {
  const navigate = useNavigate()
  const createRoom = useMutation(api.rooms.createRoom)

  const [templateId, setTemplateId] = useState('freelance')
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
        creatorSide: form.get('creatorSide') === 'b' ? 'b' : 'a',
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
      <form onSubmit={handleSubmit} className="grid gap-6">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-foreground">Template</legend>
          <p className="text-xs text-muted-foreground">
            Templates decide which terms are on the table.
          </p>
          <div className="mt-1 grid gap-2">
            {liveTemplates.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3"
              >
                <input
                  type="radio"
                  name="templateId"
                  value={option.id}
                  checked={templateId === option.id}
                  onChange={() => setTemplateId(option.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {option.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option.summary}
                  </span>
                </span>
              </label>
            ))}
            {['Sublet or rental', 'Used goods', 'Group trip costs'].map((soon) => (
              <p key={soon} className="pl-8 text-xs text-muted-foreground/70">
                {soon} — soon
              </p>
            ))}
          </div>
        </fieldset>

        <Labelled
          label="What is it about?"
          htmlFor="title"
          hint="A short description both of you will recognise."
        >
          <Input id="title" name="title" required placeholder="Customer dashboard, 4 screens" />
        </Labelled>

        <Labelled
          label="Link to the details (optional)"
          htmlFor="contextUrl"
          hint="A job post or listing. Used to gather evidence both of you can see. Anything found there is shown to you both, and never sets anyone's limits."
        >
          <Input id="contextUrl" name="contextUrl" type="url" placeholder="https://" />
        </Labelled>

        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="Your name" htmlFor="creatorName">
            <Input id="creatorName" name="creatorName" required />
          </Labelled>
          <Labelled label="Their name" htmlFor="counterpartyName">
            <Input id="counterpartyName" name="counterpartyName" required />
          </Labelled>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-foreground">Which side are you?</legend>
          <p className="text-xs text-muted-foreground">
            This decides which way each term runs for you.
          </p>
          <div className="mt-1 flex gap-2">
            {(
              [
                { value: 'a', label: template.sideALabel },
                { value: 'b', label: template.sideBLabel },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="creatorSide"
                  value={option.value}
                  defaultChecked={option.value === 'a'}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        {error !== null && (
          <p role="alert" className="text-sm text-no-deal">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Continue to your limits'}
          </Button>
          <p className="text-xs text-muted-foreground">Nothing is sent yet.</p>
        </div>
      </form>
    </PageShell>
  )
}
