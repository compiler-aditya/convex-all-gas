import { Check, MessageSquare, UserRoundPlus } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DimensionTrack } from './dimension-track'
import { useRoom } from './room-context'
import { formatValue, getConfirmedProposal, getTermComparisons, getTrackState, type PublicScenario } from './model'
import type { Dimension } from '../../../convex/templates/types'

const shortLabels: Readonly<Record<string, string>> = {
  rate: 'Total fee', deliveryDays: 'Delivery', scopeUnits: 'Scope', revisions: 'Revisions', upfrontPercent: 'Upfront payment',
}

/**
 * A track for one dimension, when there is one to draw.
 *
 * A viewer can leave a term unbounded — no floor, no ceiling, no opinion. There
 * is then no private region to shade, and a track would have to invent one. Say
 * so instead: the public comparison above it is still meaningful.
 */
function TrackFor({
  dimension,
  scenario,
  accentOutcome,
}: {
  dimension: Dimension
  scenario: PublicScenario
  accentOutcome?: boolean
}) {
  const { getMyPosition, displayScales, mySide } = useRoom()
  const position = getMyPosition(dimension.key)

  if (position === undefined) {
    return (
      <p className="track-reading-note">
        You set no limit on this term, so there is nothing private to compare
        it against.
      </p>
    )
  }

  return (
    <DimensionTrack
      dimension={dimension}
      scale={displayScales[dimension.key]}
      mySide={mySide}
      myPosition={position}
      state={getTrackState(dimension.key, scenario, mySide)}
      accentOutcome={accentOutcome}
    />
  )
}

export function GapPanel({ scenario, expandedTerms, onExpandedTermsChange }: {
  scenario: PublicScenario
  expandedTerms: string[]
  onExpandedTermsChange: (value: string[]) => void
}) {
  const { template, mySide, room } = useRoom()
  const comparisons = getTermComparisons(template.dimensions, scenario.offers, mySide)
  const unmatched = comparisons.filter((term) => !term.matches)
  const matched = comparisons.filter((term) => term.matches)
  const finalProposal = getConfirmedProposal(scenario)
  const waiting = comparisons.length === 0 && !finalProposal

  // Open terms show their track without a click. Settled ones stay collapsed:
  // once a value is agreed, the distance that produced it is history.
  const openByDefault = unmatched.map((term) => term.dimension.key)
  const effectiveExpanded =
    expandedTerms.length === 0 && !finalProposal ? openByDefault : expandedTerms

  return (
    <aside className="deal-section" aria-labelledby="deal-heading">
      <Card className="deal-card">
        <CardHeader className="deal-header">
          <CardTitle><h2 id="deal-heading" className="deal-heading">{waiting ? 'What happens next' : finalProposal ? 'Your final terms' : 'The deal so far'}</h2></CardTitle>
          <CardDescription>{waiting ? 'A little context while you wait.' : finalProposal ? `Confirmed by you and ${room.counterpartyName}` : unmatched.length > 0 ? `${unmatched.length} terms still open` : 'Offers match. Confirmation is still needed.'}</CardDescription>
        </CardHeader>
        <CardContent className="deal-content">
          {waiting ? (
            <ol className="next-steps">
              <li><span className="next-step-icon"><UserRoundPlus className="size-5" aria-hidden="true" /></span><div><h3>{room.counterpartyName} joins the room</h3><p>They set their own brief, privately.</p></div></li>
              <li><span className="next-step-icon"><MessageSquare className="size-5" aria-hidden="true" /></span><div><h3>The agents explore terms</h3><p>You get the important updates, without the back-and-forth.</p></div></li>
            </ol>
          ) : finalProposal ? (
            <Accordion multiple value={effectiveExpanded} onValueChange={(value) => onExpandedTermsChange(value as string[])} aria-label="Confirmed terms and private comparisons">
              {template.dimensions.map((dimension) => (
                <AccordionItem value={dimension.key} key={dimension.key}>
                  <AccordionTrigger className="final-term-trigger">
                    <span className="final-term-label">{shortLabels[dimension.key]}</span>
                    <span className="final-term-value tabular-nums">{formatValue(dimension, finalProposal.terms[dimension.key])}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <TrackFor dimension={dimension} scenario={scenario} accentOutcome={dimension.key === 'rate'} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Accordion multiple value={effectiveExpanded} onValueChange={(value) => onExpandedTermsChange(value as string[])} aria-label="Current public offers">
              {unmatched.map(({ dimension, yours, theirs }) => (
                <AccordionItem value={dimension.key} key={dimension.key} className="open-term">
                  <AccordionTrigger className="term-trigger" aria-label={`Compare ${shortLabels[dimension.key].toLowerCase()}: your offer ${formatValue(dimension, yours)}, ${room.counterpartyName}’s offer ${formatValue(dimension, theirs)}`}>
                    <span className="term-summary">
                      <span className="term-name">{shortLabels[dimension.key]}</span>
                      <span className="offer-comparison">
                        <span className="comparison-side"><span className="comparison-label">Your offer</span><span className="comparison-value tabular-nums">{formatValue(dimension, yours)}</span></span>
                        <span className="comparison-side"><span className="comparison-label">{room.counterpartyName}&apos;s offer</span><span className="comparison-value tabular-nums">{formatValue(dimension, theirs)}</span></span>
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <TrackFor dimension={dimension} scenario={scenario} />
                  </AccordionContent>
                </AccordionItem>
              ))}
              {matched.length > 0 && (
                <AccordionItem value="matched" className="matched-disclosure">
                  <AccordionTrigger className="matched-trigger"><span className="matching-label"><Check className="size-4" aria-hidden="true" />{matched.length} {unmatched.length ? 'other ' : ''}terms match</span></AccordionTrigger>
                  <AccordionContent>
                    <Accordion
                      multiple
                      value={expandedTerms.filter((key) => matched.some(({ dimension }) => dimension.key === key))}
                      onValueChange={(value) => onExpandedTermsChange([...expandedTerms.filter((key) => !matched.some(({ dimension }) => dimension.key === key)), ...value as string[]])}
                      aria-label="Matching public terms"
                    >
                      {matched.map(({ dimension, yours }) => (
                        <AccordionItem value={dimension.key} key={dimension.key}>
                          <AccordionTrigger className="final-term-trigger"><span className="final-term-label">{shortLabels[dimension.key]}</span><span className="final-term-value tabular-nums">{formatValue(dimension, yours)}</span></AccordionTrigger>
                          <AccordionContent><TrackFor dimension={dimension} scenario={scenario} /></AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                    <p className="matched-explanation">The same values appear in both latest offers.</p>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </CardContent>
        <CardFooter>
          <p className="deal-footnote">{waiting ? 'No public offers have been exchanged yet.' : finalProposal ? 'An example outcome. No real agreement was created.' : 'Matching offers aren’t an agreement. Both of you still need to confirm.'}</p>
        </CardFooter>
      </Card>
    </aside>
  )
}
