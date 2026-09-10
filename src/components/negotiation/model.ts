import type { Dimension } from '../../../convex/templates/types'

export type Side = 'a' | 'b'
export type PreviewState = 'waiting' | 'negotiating' | 'hard-limit' | 'settled'

export type PrivatePosition = Readonly<{
  limit: number
  priority: 1 | 2 | 3 | 4 | 5
  isHard: boolean
}>

// Scales are public display configuration, never calculated from anyone's bounds.
export type DisplayScale = Readonly<{ min: number; max: number }>

export type TrackState =
  | Readonly<{ status: 'waiting' }>
  | Readonly<{ status: 'negotiating'; yourOffer: number; theirOffer: number }>
  | Readonly<{ status: 'settled'; yourOffer: number; theirOffer: number; finalValue: number }>

// Intentionally accepts only the viewer's position and published offer values.
export type DimensionTrackProps = Readonly<{
  dimension: Dimension
  scale: DisplayScale
  mySide: Side
  myPosition: PrivatePosition
  state: TrackState
  accentOutcome?: boolean
}>

export type PublicOffer = Readonly<{
  id: string
  round: number
  bySide: Side
  createdAt: string
  rationale: string
  terms: Readonly<Record<string, number>>
  citations: ReadonlyArray<{ url: string; title: string }>
}>

export type PublicConfirmation = Readonly<{
  id: string
  proposalId: string
  bySide: Side
  createdAt: string
}>

export type PublicScenario = Readonly<{
  status: PreviewState
  offers: ReadonlyArray<PublicOffer>
  confirmations: ReadonlyArray<PublicConfirmation>
}>

export type TermDelta = Readonly<{
  current: number
  previous: number | null
  difference: number | null
}>

export type OfferHistoryEntry = Readonly<{
  offer: PublicOffer
  deltas: Readonly<Record<string, TermDelta>>
}>

export type TermComparison = Readonly<{
  dimension: Dimension
  yours: number
  theirs: number
  matches: boolean
}>

export type PublicActivity = Readonly<{
  id: string
  kind: 'offer' | 'confirmation'
  bySide: Side
  title: string
  detail: string
  createdAt: string
}>

export type AgentBriefingCopy = Readonly<{
  label: string
  heading: string
  update: string
  nextStep: string
  explanation: string
}>

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
})

export function formatFigure(value: number): string {
  return numberFormatter.format(value)
}

export function formatTime(value: string): string {
  return `${timeFormatter.format(new Date(value))} UTC`
}

export function formatValue(dimension: Dimension, value: number): string {
  const figure = formatFigure(value)
  if (dimension.type === 'money') return `${dimension.unit ?? '₹'}${figure}`
  if (dimension.type === 'percent') return `${figure}%`
  if (!dimension.unit) return figure
  const unit = value === 1 ? dimension.unit.replace(/s$/, '') : dimension.unit
  return `${figure} ${unit}`
}

export function getLimitDirection(dimension: Dimension, mySide: Side) {
  return dimension.higherFavors === mySide ? 'minimum' : 'maximum'
}

export function scalePosition(value: number, scale: DisplayScale): number {
  if (!Number.isFinite(value) || !Number.isFinite(scale.min) || !Number.isFinite(scale.max) || scale.min >= scale.max) {
    throw new Error('A track needs a finite value and an increasing display scale.')
  }
  return Math.max(0, Math.min(100, ((value - scale.min) / (scale.max - scale.min)) * 100))
}

export function getPublicOfferDistance(state: TrackState): number | null {
  return state.status === 'waiting' ? null : Math.abs(state.yourOffer - state.theirOffer)
}

export function chronologicalOffers(offers: ReadonlyArray<PublicOffer>): PublicOffer[] {
  return [...offers].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.round - b.round)
}

export function getOfferDeltas(offer: PublicOffer, precedingOffers: ReadonlyArray<PublicOffer>): Record<string, TermDelta> {
  const previous = chronologicalOffers(precedingOffers).findLast((candidate) => candidate.bySide === offer.bySide)
  return Object.fromEntries(Object.entries(offer.terms).map(([key, current]) => {
    const priorValue = previous?.terms[key] ?? null
    return [key, { current, previous: priorValue, difference: priorValue === null ? null : current - priorValue }]
  }))
}

export function getOfferHistory(offers: ReadonlyArray<PublicOffer>): OfferHistoryEntry[] {
  const ordered = chronologicalOffers(offers)
  // Compute against the same side's chronological predecessor before reversing.
  return ordered.map((offer, index) => ({ offer, deltas: getOfferDeltas(offer, ordered.slice(0, index)) })).reverse()
}

export function getLatestOffers(offers: ReadonlyArray<PublicOffer>, mySide: Side) {
  const ordered = chronologicalOffers(offers)
  return {
    yours: ordered.findLast((offer) => offer.bySide === mySide),
    theirs: ordered.findLast((offer) => offer.bySide !== mySide),
  }
}

export function getTermComparisons(dimensions: ReadonlyArray<Dimension>, offers: ReadonlyArray<PublicOffer>, mySide: Side): TermComparison[] {
  const latest = getLatestOffers(offers, mySide)
  return dimensions.flatMap((dimension) => {
    const yours = latest.yours?.terms[dimension.key]
    const theirs = latest.theirs?.terms[dimension.key]
    if (yours === undefined || theirs === undefined || !Number.isFinite(yours) || !Number.isFinite(theirs)) return []
    return [{ dimension, yours, theirs, matches: yours === theirs }]
  })
}

export function getConfirmedProposal(scenario: PublicScenario): PublicOffer | undefined {
  if (scenario.status !== 'settled') return undefined
  const proposal = chronologicalOffers(scenario.offers).at(-1)
  if (!proposal) return undefined
  const confirmedSides = new Set(scenario.confirmations
    .filter((event) => event.proposalId === proposal.id && Date.parse(event.createdAt) >= Date.parse(proposal.createdAt))
    .map((event) => event.bySide))
  return confirmedSides.has('a') && confirmedSides.has('b') ? proposal : undefined
}

export function getTrackState(key: string, scenario: PublicScenario, mySide: Side): TrackState {
  const { yours, theirs } = getLatestOffers(scenario.offers, mySide)
  const yourOffer = yours?.terms[key]
  const theirOffer = theirs?.terms[key]
  if (yourOffer === undefined || theirOffer === undefined) return { status: 'waiting' }
  const finalValue = getConfirmedProposal(scenario)?.terms[key]
  return finalValue === undefined
    ? { status: 'negotiating', yourOffer, theirOffer }
    : { status: 'settled', yourOffer, theirOffer, finalValue }
}

export function getOfferSummary(entry: OfferHistoryEntry, dimensions: ReadonlyArray<Dimension>, mySide: Side, counterpartyName: string) {
  const { offer, deltas } = entry
  const isMine = offer.bySide === mySide
  const actor = isMine ? 'Your agent' : counterpartyName
  const fee = dimensions.find((dimension) => dimension.key === 'rate')
  const feeChange = deltas.rate?.difference
  const changes = dimensions.filter((dimension) => {
    const change = deltas[dimension.key]?.difference
    return dimension.key !== 'rate' && change !== null && change !== undefined && change !== 0
  })
  if (fee && feeChange !== null && feeChange !== undefined && feeChange !== 0) {
    return {
      title: `${actor} ${feeChange > 0 ? 'increased' : 'reduced'} ${isMine ? 'the fee' : 'their offer'} by ${formatValue(fee, Math.abs(feeChange))}.`,
      detail: changes.length > 0
        ? changes.map((dimension) => `${dimension.label}: ${formatValue(dimension, offer.terms[dimension.key])}`).join(' · ')
        : 'The other published terms are unchanged.',
    }
  }
  const isOpening = Object.values(deltas).every((delta) => delta.previous === null)
  return {
    title: `${actor} ${isOpening ? 'made an opening offer' : changes.length > 0 ? 'updated the proposed terms' : 'reaffirmed the proposed terms'}.`,
    detail: (changes.length > 0 ? changes : dimensions.slice(0, 2))
      .map((dimension) => `${dimension.label}: ${formatValue(dimension, offer.terms[dimension.key])}`).join(' · '),
  }
}

export function getPublicActivity(scenario: PublicScenario, dimensions: ReadonlyArray<Dimension>, mySide: Side, myName: string, counterpartyName: string): PublicActivity[] {
  const activity: PublicActivity[] = getOfferHistory(scenario.offers).map((entry) => ({
    id: entry.offer.id,
    kind: 'offer',
    bySide: entry.offer.bySide,
    createdAt: entry.offer.createdAt,
    ...getOfferSummary(entry, dimensions, mySide, counterpartyName),
  }))
  const proposal = getConfirmedProposal(scenario)
  if (proposal) {
    for (const event of scenario.confirmations.filter((confirmation) => confirmation.proposalId === proposal.id)) {
      activity.push({
        id: event.id, kind: 'confirmation', bySide: event.bySide, createdAt: event.createdAt,
        title: `${event.bySide === mySide ? myName : counterpartyName} confirmed the final proposal.`,
        detail: 'All five terms confirmed in this example.',
      })
    }
  }
  return activity.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export const guidanceCharacterLimit = 1000
export type RoomSheet = 'brief' | 'history' | 'agreement' | null
export type RoomSession = Readonly<{
  scenario: PreviewState
  sheet: RoomSheet
  expandedTerms: string[]
  expandedOffers: string[]
  guidanceOpen: boolean
  guidanceDraft: string
  guidanceError: string | null
  notes: ReadonlyArray<string>
}>

export type RoomAction =
  | { type: 'scenario'; value: PreviewState }
  | { type: 'sheet'; value: RoomSheet }
  | { type: 'terms'; value: string[] }
  | { type: 'offers'; value: string[] }
  | { type: 'guidance-open'; value: boolean }
  | { type: 'guidance-draft'; value: string }
  | { type: 'guidance-add' }

export function createRoomSession(scenario: PreviewState = 'negotiating'): RoomSession {
  return { scenario, sheet: null, expandedTerms: [], expandedOffers: [], guidanceOpen: false, guidanceDraft: '', guidanceError: null, notes: [] }
}

export function roomReducer(state: RoomSession, action: RoomAction): RoomSession {
  switch (action.type) {
    case 'scenario': return createRoomSession(action.value)
    case 'sheet': return { ...state, sheet: action.value, expandedOffers: [] }
    case 'terms': return { ...state, expandedTerms: action.value }
    case 'offers': return { ...state, expandedOffers: action.value }
    case 'guidance-open': return { ...state, guidanceOpen: action.value, guidanceError: null }
    case 'guidance-draft': return { ...state, guidanceDraft: action.value, guidanceError: null }
    case 'guidance-add': {
      const note = state.guidanceDraft.trim()
      if (!note) return { ...state, guidanceError: 'Write a note before adding it.' }
      if (note.length > guidanceCharacterLimit) return { ...state, guidanceError: 'Keep your note to 1,000 characters or fewer.' }
      if (state.scenario === 'settled') return state
      return { ...state, guidanceDraft: '', guidanceError: null, notes: [...state.notes, note] }
    }
  }
}
