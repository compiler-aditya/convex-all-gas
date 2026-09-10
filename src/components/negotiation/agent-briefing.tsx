import { useId, useRef } from 'react'
import { Blend, Check, CircleCheck, LockKeyhole, MessageSquare, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
import { AgreementReview } from './offer-record'
import { guidanceCharacterLimit, type AgentBriefingCopy, type PublicScenario, type RoomSession } from './model'

type GuidanceState = Pick<RoomSession, 'guidanceOpen' | 'guidanceDraft' | 'guidanceError' | 'notes'>

type AgentBriefingProps = {
  copy: AgentBriefingCopy
  scenario: PublicScenario
  guidance: GuidanceState
  onGuidanceToggle: (open: boolean) => void
  onDraftChange: (value: string) => void
  onAddGuidance: () => void
  agreementOpen: boolean
  onAgreementOpenChange: (open: boolean) => void
}

function GuidanceComposer({ guidance, onDraftChange, onAddGuidance, onClose }: {
  guidance: GuidanceState
  onDraftChange: (value: string) => void
  onAddGuidance: () => void
  onClose: () => void
}) {
  const id = useId()
  const input = useRef<HTMLTextAreaElement>(null)

  return (
    <form className="guidance-composer" onSubmit={(event) => {
      event.preventDefault()
      onAddGuidance()
      input.current?.focus()
    }}>
      <FieldGroup>
        <Field data-invalid={!!guidance.guidanceError || undefined}>
          <FieldLabel htmlFor={id}><LockKeyhole className="size-4" aria-hidden="true" />A note for your agent</FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              ref={input}
              id={id}
              autoFocus
              rows={3}
              maxLength={guidanceCharacterLimit}
              value={guidance.guidanceDraft}
              onChange={(event) => onDraftChange(event.target.value)}
              aria-invalid={!!guidance.guidanceError}
              aria-describedby={`${id}-help${guidance.guidanceError ? ` ${id}-error` : ''}`}
              placeholder="e.g. I can start on Monday, but need time for a careful handover."
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  onClose()
                }
              }}
            />
            <InputGroupAddon align="block-end" className="justify-between">
              <InputGroupButton size="sm" onClick={onClose}>Cancel</InputGroupButton>
              <InputGroupButton type="submit" variant="default" size="sm">Add demo note<Check data-icon="inline-end" aria-hidden="true" /></InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {guidance.guidanceError && <FieldError id={`${id}-error`}>{guidance.guidanceError}</FieldError>}
          <FieldDescription id={`${id}-help`}>Context only. Notes do not change your limits or public offers. Nothing is sent.</FieldDescription>
        </Field>
        {guidance.notes.length > 0 && (
          <div className="guidance-receipts">
            <Alert variant="quiet" role="status">
              <CircleCheck aria-hidden="true" />
              <AlertTitle>Added to this demo only. Nothing was sent.</AlertTitle>
              <AlertDescription>Your notes reset when you switch scenarios or reload.</AlertDescription>
            </Alert>
            <ol className="private-notes" aria-label="Your private demo notes">
              {guidance.notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}
            </ol>
          </div>
        )}
      </FieldGroup>
    </form>
  )
}

export function AgentBriefing({ copy, scenario, guidance, onGuidanceToggle, onDraftChange, onAddGuidance, agreementOpen, onAgreementOpenChange }: AgentBriefingProps) {
  const guideTrigger = useRef<HTMLButtonElement>(null)
  const composerId = useId()
  const settled = scenario.status === 'settled'
  const closeGuidance = () => {
    onGuidanceToggle(false)
    guideTrigger.current?.focus()
  }

  return (
    <section className="agent-section" aria-labelledby="agent-heading">
      <Card variant="agent" className="agent-card">
        <CardHeader className="briefing-header">
          <div className="briefing-identity">
            <div className="agent-label"><span className="agent-mark"><Blend className="size-5" aria-hidden="true" strokeWidth={1.7} /></span><span>Your agent</span></div>
            <Badge variant="outline"><span className="status-dot" aria-hidden="true" />{copy.label}</Badge>
          </div>
          <div className="briefing-copy" aria-live="polite" aria-atomic="true">
            <CardTitle><h2 className="agent-heading text-balance" id="agent-heading">{copy.heading}</h2></CardTitle>
            <CardDescription>{copy.update}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="briefing-content">
          <Alert variant="quiet" role="note">
            {scenario.status === 'hard-limit' ? <ShieldCheck aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
            <AlertTitle>{copy.nextStep}</AlertTitle>
            <AlertDescription>{copy.explanation}</AlertDescription>
          </Alert>
          {guidance.guidanceOpen && !settled && (
            <div id={composerId}>
              <GuidanceComposer guidance={guidance} onDraftChange={onDraftChange} onAddGuidance={onAddGuidance} onClose={closeGuidance} />
            </div>
          )}
        </CardContent>
        <CardFooter className="briefing-footer">
          {settled ? (
            <AgreementReview scenario={scenario} open={agreementOpen} onOpenChange={onAgreementOpenChange} />
          ) : (
            <Button ref={guideTrigger} size="lg" aria-expanded={guidance.guidanceOpen} aria-controls={guidance.guidanceOpen ? composerId : undefined} onClick={() => guidance.guidanceOpen ? closeGuidance() : onGuidanceToggle(true)}>
              <MessageSquare data-icon="inline-start" aria-hidden="true" />Guide your agent
            </Button>
          )}
          <span className="briefing-footnote">
            {settled ? 'Example agreement' : <><LockKeyhole className="size-4" aria-hidden="true" />{guidance.notes.length > 0 ? `${guidance.notes.length} private demo ${guidance.notes.length === 1 ? 'note' : 'notes'}` : 'Only you and your agent'}</>}
          </span>
        </CardFooter>
      </Card>
    </section>
  )
}
