import { requireTemplate } from '../../../convex/templates'
import type { AgentBriefingCopy, DisplayScale, PreviewState, PrivatePosition, PublicOffer, PublicScenario } from './model'

export const template = requireTemplate('freelance')
export const mySide = 'a' as const

export const room = {
  title: 'Product website build',
  description: 'Design implementation & React development',
  myName: 'Maya',
  counterpartyName: 'Devin',
} as const

export const previewStates: ReadonlyArray<{ value: PreviewState; label: string }> = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'negotiating', label: 'Negotiating' },
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
    id: 'offer-1', round: 1, bySide: 'a', createdAt: '2026-09-10T10:24:00Z',
    rationale: 'For the initial 3-screen scope, I propose a total fee of ₹1,35,000, delivered in 35 days. This includes 2 revision rounds, with 50% paid upfront to reserve the project window.',
    terms: { rate: 135000, deliveryDays: 35, scopeUnits: 3, revisions: 2, upfrontPercent: 50 },
    citations: [{ url: 'https://www.upwork.com/hire/react-js-developers/cost/', title: 'React developer rates' }],
  },
  {
    id: 'offer-2', round: 2, bySide: 'b', createdAt: '2026-09-10T10:27:00Z',
    rationale: 'We need all 4 screens for the initial release. I can offer ₹1,05,000 for delivery in 28 days, including 3 revision rounds. A 30% upfront payment would leave room for the launch budget.',
    terms: { rate: 105000, deliveryDays: 28, scopeUnits: 4, revisions: 3, upfrontPercent: 30 },
    citations: [{ url: 'https://www.upwork.com/hire/react-js-developers/cost/', title: 'React developer rates' }],
  },
  {
    id: 'offer-3', round: 3, bySide: 'a', createdAt: '2026-09-10T10:31:00Z',
    rationale: 'I can include the fourth screen and an additional revision round, and bring the fee down to ₹1,25,000. A 32-day delivery window and 40% upfront would give me the room to make that work.',
    terms: { rate: 125000, deliveryDays: 32, scopeUnits: 4, revisions: 3, upfrontPercent: 40 },
    citations: [{ url: 'https://www.upwork.com/hire/react-js-developers/cost/', title: 'React developer rates' }],
  },
  {
    id: 'offer-4', round: 4, bySide: 'b', createdAt: '2026-09-10T10:34:00Z',
    rationale: 'The scope and revision rounds work for us. I can increase the fee to ₹1,15,000 and meet the 40% upfront payment. Could we bring delivery to 30 days to stay close to our launch date?',
    terms: { rate: 115000, deliveryDays: 30, scopeUnits: 4, revisions: 3, upfrontPercent: 40 },
    citations: [],
  },
]

const hardLimitCounteroffer: PublicOffer = {
  ...offers[3],
  rationale: 'The scope and revision rounds work for us. I can increase the fee to ₹1,08,000 and meet the 40% upfront payment. Could we bring delivery to 30 days to stay close to our launch date?',
  terms: { rate: 108000, deliveryDays: 30, scopeUnits: 4, revisions: 3, upfrontPercent: 40 },
}

export const finalProposal: PublicOffer = {
  id: 'offer-5', round: 5, bySide: 'b', createdAt: '2026-09-10T10:38:00Z',
  rationale: 'I can meet the ₹1,25,000 fee and the 32-day delivery window. The full proposal is 4 screens, 3 revision rounds, and 40% paid upfront. These are the complete terms for us both to confirm.',
  terms: { rate: 125000, deliveryDays: 32, scopeUnits: 4, revisions: 3, upfrontPercent: 40 },
  citations: [],
}

export const scenarios: Readonly<Record<PreviewState, PublicScenario>> = {
  waiting: { status: 'waiting', offers: [], confirmations: [] },
  negotiating: { status: 'negotiating', offers, confirmations: [] },
  'hard-limit': { status: 'hard-limit', offers: [...offers.slice(0, 3), hardLimitCounteroffer], confirmations: [] },
  settled: {
    status: 'settled', offers: [...offers, finalProposal],
    confirmations: [
      { id: 'confirmation-maya', proposalId: finalProposal.id, bySide: 'a', createdAt: '2026-09-10T10:39:00Z' },
      { id: 'confirmation-devin', proposalId: finalProposal.id, bySide: 'b', createdAt: '2026-09-10T10:40:00Z' },
    ],
  },
}

// Authored scenario summaries, not live agent reasoning or execution logs.
export const briefings: Readonly<Record<PreviewState, AgentBriefingCopy>> = {
  waiting: {
    label: 'Ready when you are',
    heading: 'Your agent is ready. Waiting for Devin.',
    update: 'Your private brief is in place. Once Devin joins, the agents can start exploring terms for your project.',
    nextStep: 'No action needed.',
    explanation: 'You can add context for your agent while you wait.',
  },
  negotiating: {
    label: 'In progress',
    heading: 'Your agent is reviewing Devin’s counteroffer.',
    update: 'Devin raised the fee and matched your upfront payment. Fee and delivery are the two terms still to work through.',
    nextStep: 'No action needed.',
    explanation: 'Your agent is working on the remaining terms.',
  },
  'hard-limit': {
    label: 'Protecting your limit',
    heading: 'Your agent is holding your minimum fee.',
    update: 'Devin’s latest fee is below your fixed minimum. Your agent will protect that boundary while exploring the remaining terms.',
    nextStep: 'No need to change your limit.',
    explanation: 'Your minimum stays private. Other terms can still move.',
  },
  settled: {
    label: 'Terms confirmed',
    heading: 'Common ground, found. Your terms are confirmed.',
    update: 'You and Devin confirmed the same final proposal in this example. All five terms are ready to review together.',
    nextStep: 'Nothing more to negotiate.',
    explanation: 'Review the example agreement whenever you’re ready.',
  },
}

export function getMyPosition(key: string, preview: PreviewState): PrivatePosition {
  const position = myPositions[key]
  return preview === 'hard-limit' && key === 'rate' ? { ...position, isHard: true } : position
}
