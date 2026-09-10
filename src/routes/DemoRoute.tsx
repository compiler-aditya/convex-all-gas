import { useState } from 'react'
import { NegotiationRoom } from '../components/negotiation/negotiation-room'
import { RoomProvider, type RoomData } from '../components/negotiation/room-context'
import {
  briefings,
  displayScales,
  getMyPosition,
  mySide,
  previewStates,
  room,
  scenarios,
  template,
} from '../components/negotiation/fixtures'
import type { PreviewState } from '../components/negotiation/model'

/**
 * A worked example, on fixtures.
 *
 * Reachable without an account so a visitor can see what a negotiation looks
 * like before committing to one. It is labelled as an example throughout — the
 * scenario switcher in the footer makes clear this is not live data, which is
 * the distinction between a labelled sandbox and an app quietly running on
 * mocks.
 */
export function DemoRoute() {
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
