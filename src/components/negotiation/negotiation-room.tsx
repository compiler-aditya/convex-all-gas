import { useReducer } from 'react'
import { ArrowRightLeft, Blend, FlaskConical } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useAppearance, type Appearance } from '@/hooks/use-appearance'
import { AgentBriefing } from './agent-briefing'
import { GapPanel } from './gap-panel'
import { OfferRecord } from './offer-record'
import { PrivatePositionPanel } from './private-position'
import { briefings, previewStates, room, scenarios } from './fixtures'
import { createRoomSession, roomReducer, type PreviewState } from './model'

export function NegotiationRoom() {
  const [session, dispatch] = useReducer(roomReducer, undefined, () => createRoomSession())
  const { appearance, setAppearance } = useAppearance()
  const scenario = scenarios[session.scenario]

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
          <p className="header-demo-label">Demo <span aria-hidden="true">·</span> mock data</p>
        </div>
      </header>

      <main className="room-main" id="room-content" tabIndex={-1}>
        <section className="room-intro" aria-labelledby="room-title">
          <div className="intro-copy">
            <p className="project-type">Freelance contract</p>
            <h1 id="room-title" className="room-title text-balance">{room.title}</h1>
            <div className="room-participants">
              <span><span className="participant-name">Maya <span className="participant-you">(you)</span></span><span className="participant-role"> · Freelancer</span></span>
              <ArrowRightLeft className="size-4" aria-label="negotiating with" />
              <span><span className="participant-name">Devin</span><span className="participant-role"> · Client</span></span>
            </div>
          </div>
          <PrivatePositionPanel
            preview={session.scenario}
            open={session.sheet === 'brief'}
            onOpenChange={(open) => dispatch({ type: 'sheet', value: open ? 'brief' : null })}
          />
        </section>

        <div className="room-story" key={session.scenario}>
          <div className="room-panels">
            <AgentBriefing
              copy={briefings[session.scenario]}
              scenario={scenario}
              guidance={session}
              onGuidanceToggle={(open) => dispatch({ type: 'guidance-open', value: open })}
              onDraftChange={(value) => dispatch({ type: 'guidance-draft', value })}
              onAddGuidance={() => dispatch({ type: 'guidance-add' })}
              agreementOpen={session.sheet === 'agreement'}
              onAgreementOpenChange={(open) => dispatch({ type: 'sheet', value: open ? 'agreement' : null })}
            />
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

        <footer className="room-footer">
          <p className="demo-label"><FlaskConical className="size-4" aria-hidden="true" />Demo <span aria-hidden="true">·</span> mock data</p>
          <div className="demo-controls">
            <div className="footer-control">
              <label htmlFor="demo-scenario">Scenario</label>
              <select id="demo-scenario" value={session.scenario} onChange={(event) => dispatch({ type: 'scenario', value: event.target.value as PreviewState })}>
                {previewStates.map((state) => <option value={state.value} key={state.value}>{state.label}</option>)}
              </select>
            </div>
            <Separator orientation="vertical" className="footer-divider" />
            <div className="footer-control">
              <label htmlFor="appearance">Appearance</label>
              <select id="appearance" value={appearance} onChange={(event) => setAppearance(event.target.value as Appearance)}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
