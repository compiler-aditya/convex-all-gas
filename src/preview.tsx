import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
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
 * Deliberately initialises neither Convex nor authentication, and passes no
 * actions — there is nothing here to send. The scenario switcher is injected as
 * the room's `demoFooter`, which is what keeps demo controls out of the app.
 */
function Preview() {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
