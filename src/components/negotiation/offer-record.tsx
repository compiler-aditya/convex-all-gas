import { ArrowDownLeft, ArrowUpRight, Check, CircleCheck, FileText } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { mySide, room, template } from './fixtures'
import { formatTime, formatValue, getConfirmedProposal, getOfferHistory, getPublicActivity, type OfferHistoryEntry, type PublicScenario } from './model'

function OfferEntry({ entry, latest }: { entry: OfferHistoryEntry; latest: boolean }) {
  const { offer, deltas } = entry
  const isMine = offer.bySide === mySide
  const opening = Object.values(deltas).every((delta) => delta.previous === null)

  return (
    <AccordionItem value={offer.id} className="history-entry" data-offer-id={offer.id}>
      <AccordionTrigger className="history-trigger">
        <span className="history-trigger-copy">
          <span className="history-offer-heading"><span>{isMine ? 'Your agent’s' : 'Devin’s'} {opening ? 'opening offer' : 'counteroffer'}</span>{latest && <Badge variant="secondary">Latest</Badge>}</span>
          <span className="history-offer-meta"><span>Offer {offer.round}</span><span aria-hidden="true">·</span><time dateTime={offer.createdAt}>{formatTime(offer.createdAt)}</time></span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="history-offer-content">
        <div className="offer-rationale-block"><h4>Agent&apos;s rationale</h4><p className="offer-rationale">{offer.rationale}</p></div>
        <table className="offer-terms">
          <caption className="sr-only">Offer {offer.round}: public terms and changes from the same participant&apos;s previous offer</caption>
          <thead><tr><th scope="col">Term</th><th scope="col">Offer</th><th scope="col">Change</th></tr></thead>
          <tbody>
            {template.dimensions.map((dimension) => {
              const delta = deltas[dimension.key]
              return (
                <tr key={dimension.key}>
                  <th scope="row">{dimension.label}</th>
                  <td className="offer-value tabular-nums">{formatValue(dimension, delta.current)}</td>
                  <td className="offer-delta tabular-nums">
                    {delta.previous === null ? 'First offer' : delta.difference === 0 ? 'No change' : (
                      <span className="changed-value"><span aria-hidden="true">{delta.difference! > 0 ? '+' : '−'}</span><span className="sr-only">{delta.difference! > 0 ? 'Increased by ' : 'Decreased by '}</span>{formatValue(dimension, Math.abs(delta.difference!))}<span className="sr-only"> from {formatValue(dimension, delta.previous)}</span></span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="offer-delta-note">Changes are relative to {isMine ? 'your agent’s' : 'Devin’s'} previous offer, not the other side&apos;s.</p>
        {offer.citations.length > 0 && <div className="offer-citations"><h4>Referenced sources</h4>{offer.citations.map((citation) => <a href={citation.url} key={citation.url} target="_blank" rel="noopener noreferrer">{citation.title}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>)}</div>}
      </AccordionContent>
    </AccordionItem>
  )
}

function ConfirmationEvents({ scenario }: { scenario: PublicScenario }) {
  const proposal = getConfirmedProposal(scenario)
  if (!proposal) return null
  return (
    <ul className="confirmation-events" aria-label="Example confirmations">
      {[...scenario.confirmations].filter((event) => event.proposalId === proposal.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((event) => (
        <li key={event.id}><CircleCheck className="size-5" aria-hidden="true" /><div><p>{event.bySide === mySide ? room.myName : room.counterpartyName} confirmed the final proposal</p><time dateTime={event.createdAt}>{formatTime(event.createdAt)}</time></div></li>
      ))}
    </ul>
  )
}

export function OfferRecord({ scenario, open, onOpenChange, expandedOffers, onExpandedOffersChange }: {
  scenario: PublicScenario
  open: boolean
  onOpenChange: (value: boolean) => void
  expandedOffers: string[]
  onExpandedOffersChange: (value: string[]) => void
}) {
  const history = getOfferHistory(scenario.offers)
  const activity = getPublicActivity(scenario, template.dimensions, mySide, room.myName, room.counterpartyName)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <section className="recent-activity" aria-labelledby="activity-heading" data-public-activity>
        <header className="activity-header">
          <h2 id="activity-heading">Recent activity</h2>
          <SheetTrigger render={<Button variant="ghost" size="sm" />}>View all offers<ArrowUpRight data-icon="inline-end" aria-hidden="true" /></SheetTrigger>
        </header>
        <ol className="activity-list" aria-label="Latest public updates, newest first">
          {activity.slice(0, 2).map((event) => (
            <li className="activity-event" key={event.id}>
              <span className="activity-icon" data-own={event.bySide === mySide || undefined}>{event.kind === 'confirmation' ? <Check className="size-5" aria-hidden="true" /> : event.bySide === mySide ? <ArrowUpRight className="size-5" aria-hidden="true" /> : <ArrowDownLeft className="size-5" aria-hidden="true" />}</span>
              <div className="activity-body">
                <div className="activity-title-row"><p>{event.title}</p><time dateTime={event.createdAt}>{formatTime(event.createdAt)}</time></div>
                <p className="activity-detail">{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <SheetContent data-public-history>
        <SheetHeader><SheetTitle>All offers</SheetTitle><SheetDescription>Every published offer, newest first. Expand an offer to see its full terms and rationale.</SheetDescription></SheetHeader>
        <div className="sheet-body">
          <div className="history-date"><span>10 September 2026</span><span>{history.length} offers</span></div>
          <ConfirmationEvents scenario={scenario} />
          <Accordion multiple value={expandedOffers} onValueChange={(value) => onExpandedOffersChange(value as string[])} aria-label="Public offer history, newest first">
            {history.map((entry, index) => <OfferEntry entry={entry} latest={index === 0} key={entry.offer.id} />)}
          </Accordion>
        </div>
        <SheetFooter><p className="sheet-footnote">A complete record of the published offers in this demo.</p></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function AgreementReview({ scenario, open, onOpenChange }: { scenario: PublicScenario; open: boolean; onOpenChange: (value: boolean) => void }) {
  const proposal = getConfirmedProposal(scenario)
  if (!proposal) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger render={<Button size="lg" />}>Review agreement<FileText data-icon="inline-end" aria-hidden="true" /></SheetTrigger>
      <SheetContent data-public-agreement>
        <SheetHeader><SheetTitle>Example agreement</SheetTitle><SheetDescription>{room.title}<br />{room.myName} · Freelancer &amp; {room.counterpartyName} · Client</SheetDescription></SheetHeader>
        <div className="sheet-body agreement-body">
          <section aria-labelledby="final-terms-heading"><h3 id="final-terms-heading" className="sheet-section-heading">The confirmed terms</h3><dl className="agreement-terms">{template.dimensions.map((dimension) => <div key={dimension.key}><dt>{dimension.label}</dt><dd className="tabular-nums">{formatValue(dimension, proposal.terms[dimension.key])}</dd></div>)}</dl></section>
          <ConfirmationEvents scenario={scenario} />
          <Alert role="note"><FileText aria-hidden="true" /><AlertTitle>An example, not a real agreement</AlertTitle><AlertDescription>Both participants confirmed this proposal in the demo. No real agreement was created and no action was taken on your behalf.</AlertDescription></Alert>
        </div>
        <SheetFooter><SheetClose render={<Button variant="outline" />}>Back to room</SheetClose></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
