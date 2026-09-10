import { useReducer, useState, type ReactNode } from 'react'
import { ArrowRightLeft, Blend } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useAppearance, type Appearance } from '@/hooks/use-appearance'
import { AgentBriefing } from './agent-briefing'
import { GapPanel } from './gap-panel'
import { OfferRecord } from './offer-record'
import { PrivatePositionPanel } from './private-position'
import { useRoom } from './room-context'
import { createRoomSession, roomReducer } from './model'

/**
 * The room. Reads its data from context, so the same component renders against
 * fixtures in the preview and against live Convex data in the app.
 *
 * `demoFooter` is how the preview injects its scenario switcher. The app passes
 * nothing, which is what keeps demo controls out of the product.
 */
export function NegotiationRoom({ demoFooter }: { demoFooter?: ReactNode } = {}) {
  const { room, scenario, briefing, template, mySide, canStart, actions } = useRoom()
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [session, dispatch] = useReducer(roomReducer, undefined, () => createRoomSession())
  const { appearance, setAppearance } = useAppearance()

  return (
    <div className="room-page font-sans">
      <a className="skip-link" href="#room-content">Skip to negotiation room</a>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand-cluster">
            <a className="wordmark" href="/" aria-label="Overlap home">
              <Blend className="brand-symbol" aria-hidden="true" strokeWidth={1.8} />
              overlap
            </a>
            <Separator orientation="vertical" className="brand-divider" />
            <span className="workspace-label">Negotiation room</span>
          </div>
          {demoFooter !== undefined && (
            <p className="header-demo-label">Preview <span aria-hidden="true">·</span> fixtures</p>
          )}
        </div>
      </header>

      <main className="room-main" id="room-content" tabIndex={-1}>
        <section className="room-intro" aria-labelledby="room-title">
          <div className="intro-copy">
            <p className="project-type">Freelance contract</p>
            <h1 id="room-title" className="room-title text-balance">{room.title}</h1>
            <div className="room-participants">
              <span><span className="participant-name">{room.myName} <span className="participant-you">(you)</span></span><span className="participant-role"> · {mySide === 'a' ? template.sideALabel : template.sideBLabel}</span></span>
              <ArrowRightLeft className="size-4" aria-label="negotiating with" />
              <span><span className="participant-name">{room.counterpartyName}</span><span className="participant-role"> · {mySide === 'a' ? template.sideBLabel : template.sideALabel}</span></span>
            </div>
          </div>
          <PrivatePositionPanel
            preview={scenario.status}
            open={session.sheet === 'brief'}
            onOpenChange={(open) => dispatch({ type: 'sheet', value: open ? 'brief' : null })}
          />
        </section>

        <div className="room-story" key={scenario.status}>
          <div className="room-panels">
            <AgentBriefing
              copy={briefing}
              scenario={scenario}
              guidance={session}
              onGuidanceToggle={(open) => dispatch({ type: 'guidance-open', value: open })}
              onDraftChange={(value) => dispatch({ type: 'guidance-draft', value })}
              onAddGuidance={() => dispatch({ type: 'guidance-add' })}
              agreementOpen={session.sheet === 'agreement'}
              onAgreementOpenChange={(open) => dispatch({ type: 'sheet', value: open ? 'agreement' : null })}
            />
            {canStart === true && actions !== undefined && (
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => {
                    setStarting(true)
                    setStartError(null)
                    void actions
                      .startNegotiation()
                      .then((result) => {
                        if (!result.started) setStartError(result.reason ?? 'Could not start.')
                      })
                      .catch((cause: unknown) => {
                        setStartError(cause instanceof Error ? cause.message : 'Could not start.')
                      })
                      .finally(() => setStarting(false))
                  }}
                  className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {starting ? 'Starting…' : 'Start the negotiation'}
                </button>
                <p className="text-xs text-muted-foreground">
                  Your agent makes the opening offer. You can step in at any point.
                </p>
                {startError !== null && (
                  <p role="alert" className="text-xs text-no-deal">{startError}</p>
                )}
              </div>
            )}
            <GapPanel
              scenario={scenario}
              expandedTerms={session.expandedTerms}
              onExpandedTermsChange={(value) => dispatch({ type: 'terms', value })}
            />
          </div>
          {scenario.offers.length > 0 && (
            <OfferRecord
              scenario={scenario}
              open={session.sheet === 'history'}
              onOpenChange={(open) => dispatch({ type: 'sheet', value: open ? 'history' : null })}
              expandedOffers={session.expandedOffers}
              onExpandedOffersChange={(value) => dispatch({ type: 'offers', value })}
            />
          )}
        </div>

        {demoFooter !== undefined && (
          <footer className="room-footer">
            {demoFooter}
            <div className="footer-control">
              <label htmlFor="appearance">Appearance</label>
              <select id="appearance" value={appearance} onChange={(event) => setAppearance(event.target.value as Appearance)}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </footer>
        )}
      </main>
    </div>
  )
}
