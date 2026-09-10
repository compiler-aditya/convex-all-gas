import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useRoom } from './room-context'
import { formatValue, getLimitDirection, type PreviewState, type PrivatePosition } from './model'

const priorityLabels: Record<PrivatePosition['priority'], string> = {
  1: 'Low', 2: 'Lower', 3: 'Medium', 4: 'High', 5: 'Highest',
}

export function PrivatePositionPanel({ preview, open, onOpenChange }: { preview: PreviewState; open: boolean; onOpenChange: (value: boolean) => void }) {
  const { template, mySide, room, getMyPosition } = useRoom()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger render={<Button variant="outline" />}><LockKeyhole data-icon="inline-start" aria-hidden="true" />Your private brief</SheetTrigger>
      <SheetContent data-private-brief>
        <SheetHeader><SheetTitle>Your private brief</SheetTitle><SheetDescription>For your agent, not for {room.counterpartyName}. Your limits and priorities stay out of published offers.</SheetDescription></SheetHeader>
        <div className="sheet-body private-brief-body">
          <dl className="private-terms">
            {template.dimensions.map((dimension) => {
              const position = getMyPosition(dimension.key)
              if (position === undefined) return null
              const minimum = getLimitDirection(dimension, mySide) === 'minimum'
              return (
                <div className="private-term" key={dimension.key}>
                  <dt><span>{dimension.label}</span>{position.isHard && <Badge variant="default"><LockKeyhole data-icon="inline-start" aria-hidden="true" />Fixed boundary</Badge>}</dt>
                  <dd>
                    <div className="private-amount"><span>{minimum ? 'At least' : 'Up to'}</span><strong className="tabular-nums">{formatValue(dimension, position.limit)}</strong></div>
                    <div className="private-priority"><span>Priority</span><span>{priorityLabels[position.priority]}</span></div>
                    {position.isHard && <p className="fixed-boundary-note">Your agent cannot cross this boundary. Guidance will not change it.</p>}
                  </dd>
                </div>
              )
            })}
          </dl>
          <Alert role="note"><ShieldCheck aria-hidden="true" /><AlertTitle>{preview === 'waiting' ? 'Your brief is ready' : 'Your limits are locked'}</AlertTitle><AlertDescription>{preview === 'waiting' ? 'Your limits are set. They stay locked once negotiation starts.' : 'Limits cannot be edited once negotiation starts. You can still give your agent context without changing them.'}</AlertDescription></Alert>
          <p className="sheet-footnote">Only your brief is shown here. The other side&apos;s limits are never shown, and never used to compute anything you see.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
