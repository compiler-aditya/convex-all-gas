import { requireTemplate } from '../../../convex/templates'
import type {
  DisplayScale,
  PreviewState,
  PrivatePosition,
  PublicOffer,
  TrackState,
} from './model'

export const template = requireTemplate('freelance')
export const mySide = 'a' as const

export const room = {
  id: 'OL–0241',
  title: 'Product website build',
  description: 'Design implementation & React development',
  myName: 'Maya',
  counterpartyName: 'Devin',
  maxRounds: 8,
} as const

export const previewStates: ReadonlyArray<{ value: PreviewState; label: string }> = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'negotiating', label: 'Mid-negotiation' },
  { value: 'hard-limit', label: 'Hard limit' },
  { value: 'settled', label: 'Settled' },
]

// Only Maya's private position exists in the preview. No counterparty bounds.
export const myPositions: Readonly<Record<string, PrivatePosition>> = {
  rate: { limit: 110000, priority: 5, isHard: false },
  deliveryDays: { limit: 28, priority: 3, isHard: false },
  scopeUnits: { limit: 4, priority: 4, isHard: false },
  revisions: { limit: 3, priority: 2, isHard: false },
  upfrontPercent: { limit: 30, priority: 4, isHard: false },
}

export const displayScales: Readonly<Record<string, DisplayScale>> = {
  rate: { min: 80000, max: 160000 },
  deliveryDays: { min: 14, max: 42 },
  scopeUnits: { min: 1, max: 6 },
  revisions: { min: 0, max: 5 },
  upfrontPercent: { min: 0, max: 100 },
}

export const offers: ReadonlyArray<PublicOffer> = [
  {
    id: 'offer-1',
    round: 1,
    bySide: 'a',
    createdAt: '2026-09-10T10:24:00Z',
    rationale: 'For the initial 3-screen scope, I propose a total fee of ₹1,35,000, delivered in 35 days. This includes 2 revision rounds, with 50% paid upfront to reserve the project window.',
    terms: { rate: 135000, deliveryDays: 35, scopeUnits: 3, revisions: 2, upfrontPercent: 50 },
    citations: [{ url: 'https://www.upwork.com/hire/react-js-developers/cost/', title: 'React developer rates' }],
  },
  {
    id: 'offer-2',
    round: 2,
    bySide: 'b',
    createdAt: '2026-09-10T10:27:00Z',
    rationale: 'We need all 4 screens for the initial release. I can offer ₹1,05,000 for delivery in 28 days, including 3 revision rounds. A 30% upfront payment would leave room for the launch budget.',
    terms: { rate: 105000, deliveryDays: 28, scopeUnits: 4, revisions: 3, upfrontPercent: 30 },
    citations: [{ url: 'https://www.upwork.com/hire/react-js-developers/cost/', title: 'React developer rates' }],
  },
  {
    id: 'offer-3',
    round: 3,
    bySide: 'a',
    createdAt: '2026-09-10T10:31:00Z',
    rationale: 'I can include the fourth screen and an additional revision round, and bring the fee down to ₹1,25,000. A 32-day delivery window and 40% upfront would give me the room to make that work.',
    terms: { rate: 125000, deliveryDays: 32, scopeUnits: 4, revisions: 3, upfrontPercent: 40 },
    citations: [{ url: 'https://www.upwork.com/hire/react-js-developers/cost/', title: 'React developer rates' }],
  },
  {
    id: 'offer-4',
    round: 4,
    bySide: 'b',
    createdAt: '2026-09-10T10:34:00Z',
    rationale: 'The scope and revision rounds work for us. I can increase the fee to ₹1,15,000 and meet the 40% upfront payment. Could we bring delivery to 30 days to stay close to our launch date?',
    terms: { rate: 115000, deliveryDays: 30, scopeUnits: 4, revisions: 3, upfrontPercent: 40 },
    citations: [],
  },
]

export const settlement: Readonly<Record<string, number>> = {
  rate: 125000,
  deliveryDays: 32,
  scopeUnits: 4,
  revisions: 3,
  upfrontPercent: 40,
}

export function getMyPosition(key: string, preview: PreviewState): PrivatePosition {
  const position = myPositions[key]
  return preview === 'hard-limit' && key === 'rate'
    ? { ...position, isHard: true }
    : position
}

export function getTrackState(key: string, preview: PreviewState): TrackState {
  if (preview === 'waiting') return { status: 'waiting' }
  const yourOffer = offers.findLast((offer) => offer.bySide === mySide)!.terms[key]
  const theirOffer = offers.findLast((offer) => offer.bySide !== mySide)!.terms[key]
  if (preview === 'settled') {
    return { status: 'settled', yourOffer, theirOffer, finalValue: settlement[key] }
  }
  return { status: 'negotiating', yourOffer, theirOffer }
}
