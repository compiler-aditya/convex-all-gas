import { useLayoutEffect, useRef } from 'react'
import { ArrowDown, ArrowUpRight, Copy, FileText } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { offers, room, settlement, template } from './fixtures'
import { formatFigure, formatValue, getOfferDeltas, type PreviewState, type PublicOffer } from './model'

function Rationale({ text }: { text: string }) {
  return text.split(/(₹[\d,]+|\b\d+(?:\.\d+)?%?)/g).map((part, index) => (
    /\d/.test(part)
      ? <span className="font-mono tabular-nums" key={index}>{part}</span>
      : part
  ))
}

function OfferEntry({ offer, precedingOffers }: { offer: PublicOffer; precedingOffers: ReadonlyArray<PublicOffer> }) {
  const isMine = offer.bySide === 'a'
  const deltas = getOfferDeltas(offer, precedingOffers)
  const time = new Date(offer.createdAt).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })

  return (
    <li className={cn('offer-entry', isMine ? 'offer-from-you' : 'offer-from-them')}>
      <article aria-labelledby={`${offer.id}-heading`}>
        <header className="offer-heading">
          <h3 id={`${offer.id}-heading`} className="section-label">
            <span className="font-mono tabular-nums">Round {formatFigure(offer.round).padStart(2, '0')}</span>
            <span aria-hidden="true"> · </span>
            {isMine ? 'Freelancer' : 'Client'}
            <span className="offer-name"> / {isMine ? room.myName : room.counterpartyName}</span>
          </h3>
          <time className="offer-time font-mono tabular-nums" dateTime={offer.createdAt}>{time}</time>
        </header>
        <div className="offer-content">
          <p className="offer-rationale"><Rationale text={offer.rationale} /></p>
          <table className="offer-terms">
            <caption className="sr-only">Round {offer.round} public terms and changes from this side&apos;s previous offer</caption>
            <thead className="sr-only"><tr><th>Dimension</th><th>Offer</th><th>Change from previous offer</th></tr></thead>
            <tbody>
              {template.dimensions.map((dimension) => {
                const delta = deltas[dimension.key]
                return (
                  <tr key={dimension.key}>
                    <th scope="row">{dimension.label}</th>
                    <td className="offer-value font-mono tabular-nums">{formatValue(dimension, delta.current)}</td>
                    <td className="offer-delta font-mono tabular-nums">
                      {delta.previous === null ? (
                        <span className="delta-copy font-sans">opening offer</span>
                      ) : delta.difference === 0 ? (
                        <><span aria-hidden="true">— </span><span className="delta-copy font-sans">unchanged</span><span className="sr-only"> from {formatValue(dimension, delta.previous)}</span></>
                      ) : (
                        <><span aria-label={delta.difference! > 0 ? 'Increased' : 'Decreased'}>{delta.difference! > 0 ? '↑' : '↓'}</span> <span className="delta-copy font-sans">from</span> {formatValue(dimension, delta.previous)}</>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {offer.citations.length > 0 && (
            <p className="offer-citations">
              <span>Based on</span>
              {offer.citations.map((citation) => (
                <a href={citation.url} key={citation.url} target="_blank" rel="noopener noreferrer" title={`${citation.title} — opens in a new tab`}>
                  {new URL(citation.url).hostname.replace(/^www\./, '')}
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
              ))}
            </p>
          )}
        </div>
      </article>
    </li>
  )
}

function WaitingRecord() {
  return (
    <div className="waiting-record">
      <div className="flex flex-col gap-3">
        <FileText className="size-6 text-muted-foreground" strokeWidth={1} aria-hidden="true" />
        <h3 className="text-lg font-medium text-balance">The record starts here.</h3>
        <p className="text-muted-foreground text-pretty">Your position is ready. Waiting for Devin to join and set their position privately.</p>
      </div>
      <FieldGroup>
        <Field data-disabled>
          <FieldLabel htmlFor="invite-link">Invitation link</FieldLabel>
          <div className="flex items-center gap-2">
            <Input id="invite-link" value="Available when connected" disabled readOnly />
            <Button variant="outline" size="icon" disabled aria-label="Copy invitation link"><Copy aria-hidden="true" /></Button>
          </div>
          <FieldDescription>Only send this to someone you are already dealing with.</FieldDescription>
        </Field>
      </FieldGroup>
      <p className="preview-disclaimer">Invitations are disabled in this static preview.</p>
    </div>
  )
}

function SettlementRecord() {
  return (
    <section className="settlement-record" aria-labelledby="settlement-heading">
      <div className="flex flex-col gap-2">
        <p className="section-label">Outcome</p>
        <h3 id="settlement-heading" className="text-lg font-medium">An agreement on the terms.</h3>
        <p className="text-muted-foreground">Both sides confirmed the following settlement.</p>
      </div>
      <dl className="settlement-terms">
        {template.dimensions.map((dimension) => (
          <div className="settlement-term" key={dimension.key}>
            <dt>{dimension.label}</dt>
            <dd className="font-mono tabular-nums">{formatValue(dimension, settlement[dimension.key])}</dd>
          </div>
        ))}
      </dl>
      <p className="settlement-explanation">Both sides confirm before this is binding. Your agent negotiated it; it has not agreed to anything on your behalf.</p>
      <div className="confirmation-record"><span>Maya · confirmed</span><span>Devin · confirmed</span></div>
      <p className="preview-disclaimer">Example outcome only. No agreement is created by this preview.</p>
    </section>
  )
}

export function OfferRecord({ preview }: { preview: PreviewState }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isWaiting = preview === 'waiting'
  const isSettled = preview === 'settled'

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [preview])

  return (
    <section className="record-panel" aria-labelledby="record-heading">
      <header className="column-heading">
        <div className="flex flex-col gap-1">
          <h2 id="record-heading" className="section-label">The shared record</h2>
          <p className="column-subtitle">Visible to both sides</p>
        </div>
        <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      </header>
      <div className="record-date"><span>Thursday, <span className="font-mono tabular-nums">10</span> September <span className="font-mono tabular-nums">2026</span></span><span className="font-mono tabular-nums">UTC</span></div>
      <div className="record-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Shared offers, oldest first. Scroll to review earlier offers.">
        {isWaiting ? <WaitingRecord /> : (
          <>
            <ol className="offers-list" aria-label="Public offers" aria-live="polite" aria-relevant="additions">
              {offers.map((offer, index) => <OfferEntry key={offer.id} offer={offer} precedingOffers={offers.slice(0, index)} />)}
            </ol>
            {isSettled && <SettlementRecord />}
          </>
        )}
      </div>
      <footer className="record-footer">
        <p>{isWaiting ? 'No offers have been exchanged.' : isSettled ? 'The shared record is complete.' : 'Every offer stays on the record.'}</p>
        {!isWaiting && (
          <Button variant="ghost" size="xs" onClick={() => {
            const container = scrollRef.current
            if (container) container.scrollTop = container.scrollHeight
          }}>
            {isSettled ? 'Outcome' : 'Latest offer'}<ArrowDown data-icon="inline-end" aria-hidden="true" />
          </Button>
        )}
      </footer>
    </section>
  )
}
