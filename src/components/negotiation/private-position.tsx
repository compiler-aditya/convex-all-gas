import { ChevronDown, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMyPosition, mySide, template } from './fixtures'
import { formatValue, getLimitDirection, type PreviewState } from './model'

function PositionSummary({ preview }: { preview: PreviewState }) {
  return (
    <div className="position-content">
      <div className="private-statement">
        <p>Only you will ever see this.</p>
        <p>Your agent uses it; it is never sent to the other side.</p>
      </div>
      <div className="private-sheet">
        <dl className="private-terms">
          {template.dimensions.map((dimension) => {
            const position = getMyPosition(dimension.key, preview)
            const minimum = getLimitDirection(dimension, mySide) === 'minimum'
            return (
              <div className="private-term" key={dimension.key}>
                <dt className="flex items-center justify-between gap-2">
                  <span>{dimension.label}</span>
                  {position.isHard && <span className="fixed-caption">fixed</span>}
                </dt>
                <dd className="private-term-content">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="private-limit-label">{minimum ? 'Never below' : 'Never above'}</span>
                    <span className="font-mono font-medium tabular-nums">{formatValue(dimension, position.limit)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="private-priority-label">Priority</span>
                    <span className="priority" aria-label={`Priority ${position.priority} of 5`}>
                      {[1, 2, 3, 4, 5].map((step) => (
                        <span key={step} className="priority-segment" data-filled={step <= position.priority || undefined} aria-hidden="true" />
                      ))}
                    </span>
                  </div>
                </dd>
              </div>
            )
          })}
        </dl>
        <p className="private-sheet-footer">
          <LockKeyhole className="size-3" aria-hidden="true" />
          <span>yours · not sent</span>
        </p>
      </div>
      <div className="position-lock-note">
        <p>{preview === 'waiting' ? 'Your position is ready.' : 'Your position is locked.'}</p>
        <p className="text-muted-foreground">
          {preview === 'waiting'
            ? 'The other side will set their own limits privately.'
            : 'Limits cannot be edited once negotiation begins.'}
        </p>
      </div>
      <div className="private-bottom-note">
        <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
        <p>You will never see Devin&apos;s limits. Devin will never see yours.</p>
      </div>
    </div>
  )
}

export function PrivatePositionPanel({ preview }: { preview: PreviewState }) {
  return (
    <aside className="position-panel" aria-labelledby="position-heading">
      <header className="column-heading position-desktop-heading">
        <div className="flex flex-col gap-1">
          <h2 id="position-heading" className="section-label">Your position</h2>
          <p className="column-subtitle private-subtitle"><LockKeyhole className="size-3" aria-hidden="true" /> Private to you</p>
        </div>
        <Button variant="link" size="xs" disabled title="Position editing is not available in this static preview.">Edit</Button>
      </header>
      <div className="position-desktop-content"><PositionSummary preview={preview} /></div>
      <details className="position-mobile-disclosure">
        <summary>
          <span className="flex items-center gap-2"><LockKeyhole className="size-4" aria-hidden="true" /><span>Your position · private</span></span>
          <ChevronDown className="size-4 disclosure-chevron" aria-hidden="true" />
        </summary>
        <PositionSummary preview={preview} />
      </details>
    </aside>
  )
}
