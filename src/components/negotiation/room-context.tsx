import { createContext, useContext, type ReactNode } from 'react'
import type { Template } from '../../../convex/templates/types'
import type {
  AgentBriefingCopy,
  DisplayScale,
  PrivatePosition,
  PublicScenario,
  Side,
} from './model'

/**
 * Everything the room components need, independent of where it came from.
 *
 * The same components render against fixtures in the preview and against live
 * Convex data in the app. Keeping the boundary here means the design can be
 * iterated without a backend, and the app can never accidentally boot into
 * mock data.
 *
 * Note what is absent: the counterparty's positions. There is no field for
 * them because there is no query that returns them.
 */
export type RoomData = Readonly<{
  template: Template
  mySide: Side
  room: Readonly<{
    title: string
    description?: string
    myName: string
    counterpartyName: string
  }>
  /** The viewer's own limit for a dimension, or undefined if they set none. */
  getMyPosition: (key: string) => PrivatePosition | undefined
  displayScales: Readonly<Record<string, DisplayScale>>
  scenario: PublicScenario
  briefing: AgentBriefingCopy
  /** True when both sides have a position and no offer has been made yet. */
  canStart?: boolean
  /** Absent in the preview, where there is nothing to send. */
  actions?: Readonly<{
    submitGuidance: (text: string) => Promise<void>
    confirmAgreement: () => Promise<void>
    startNegotiation: () => Promise<{ started: boolean; reason?: string }>
  }>
}>

const RoomContext = createContext<RoomData | null>(null)

export function RoomProvider({
  value,
  children,
}: {
  value: RoomData
  children: ReactNode
}) {
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export function useRoom(): RoomData {
  const value = useContext(RoomContext)
  if (value === null) {
    throw new Error('useRoom must be used inside a RoomProvider')
  }
  return value
}

/**
 * A display scale wide enough to hold everything the viewer can legitimately
 * see: the public offers, and their own limit.
 *
 * Derived only from values already on this viewer's screen, so it cannot
 * disclose anything. It does mean the two sides see slightly different scales,
 * which is correct — each is looking at their own position.
 */
export function deriveScale(
  values: ReadonlyArray<number>,
  fallback: DisplayScale,
): DisplayScale {
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) return fallback

  const low = Math.min(...finite)
  const high = Math.max(...finite)
  const span = high - low

  // A single point has no span; give it room so the marker is not on an edge.
  const padding = span === 0 ? Math.max(Math.abs(low) * 0.2, 1) : span * 0.25
  return {
    min: Math.max(0, Math.floor(low - padding)),
    max: Math.ceil(high + padding),
  }
}
