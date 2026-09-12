import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LandingPage } from './components/landing/landing-page'
import { NegotiationRoom } from './components/negotiation/negotiation-room'
import { RoomProvider, type RoomData } from './components/negotiation/room-context'
import {
  briefings,
  displayScales,
  getMyPosition,
  mySide,
  previewStates,
  room,
  scenarios,
  template,
} from './components/negotiation/fixtures'
import type { PreviewState } from './components/negotiation/model'
import './index.css'

/**
 * Design iteration against fixtures.
 *
 * Initialises neither Convex nor authentication, and passes no actions — there
 * is nothing here to send. `?demo=1` swaps the landing page for the room, which
 * is how the landing page's own links reach it.
 *
 * The room is wrapped in a fixture-backed provider here. Rendering it without
 * one throws, which is deliberate: it means the component cannot silently fall
 * back to mock data inside the real application.
 */
function PreviewRoom() {
  const [scenarioKey, setScenarioKey] = useState<PreviewState>('negotiating')

  const value: RoomData = {
    template,
    mySide,
    room,
    getMyPosition: (key) => getMyPosition(key, scenarioKey),
    displayScales,
    scenario: scenarios[scenarioKey],
    briefing: briefings[scenarioKey],
  }

  return (
    <RoomProvider value={value}>
      <NegotiationRoom
        demoFooter={
          <div className="footer-control">
            <label htmlFor="demo-scenario">Scenario</label>
            <select
              id="demo-scenario"
              value={scenarioKey}
              onChange={(event) => setScenarioKey(event.target.value as PreviewState)}
            >
              {previewStates.map((state) => (
                <option value={state.value} key={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
        }
      />
    </RoomProvider>
  )
}

const params = new URLSearchParams(window.location.search)
const showDemo = params.get('demo') === '1'
/* The landing header changes shape once someone is signed in, and that state
   is unreachable from a harness with no session — so it is passed in, which is
   why `account` is a prop rather than a hook inside the page. */
const signedIn = params.get('account') === '1'

document.title = showDemo
  ? 'Negotiation demo — Overlap'
  : 'Overlap — Different sides. Common ground.'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showDemo ? (
      <PreviewRoom />
    ) : (
      <LandingPage
        account={
          signedIn
            ? { email: 'maya@example.com', onSignOut: () => alert('sign out') }
            : undefined
        }
      />
    )}
  </StrictMode>,
)
