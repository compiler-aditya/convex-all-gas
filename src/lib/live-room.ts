import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { requireTemplate } from '../../convex/templates'
import type {
  AgentBriefingCopy,
  DisplayScale,
  PreviewState,
  PrivatePosition,
  PublicOffer,
  PublicScenario,
  Side,
} from '../components/negotiation/model'
import { deriveScale, type RoomData } from '../components/negotiation/room-context'

/**
 * Live room data, mapped from Convex into the shapes the room components use.
 *
 * Everything here is derived from queries this viewer is allowed to make. There
 * is no query for the counterparty's limits, so nothing in this file can
 * accidentally surface them — including the display scales, which are built
 * from the public offers and the viewer's own limit only.
 */

export type LiveRoom =
  | { state: 'loading' }
  | { state: 'denied' }
  | { state: 'no-deal'; dimension: string; title: string }
  | { state: 'setup'; title: string; reason: string }
  | { state: 'ready'; data: RoomData }

/** Convex weights run 0..1; the interface shows five discrete priorities. */
function toPriority(weight: number): PrivatePosition['priority'] {
  const step = Math.round(weight * 5)
  return Math.min(5, Math.max(1, step)) as PrivatePosition['priority']
}

function toStatus(roomStatus: string, offerCount: number): PreviewState {
  if (roomStatus === 'agreed') return 'settled'
  if (offerCount === 0) return 'waiting'
  return 'negotiating'
}

function briefingFor(args: {
  status: PreviewState
  counterpartyName: string
  counterpartyJoined: boolean
  counterpartyReady: boolean
  openTerms: number
  binding: boolean
}): AgentBriefingCopy {
  const { counterpartyName, status } = args

  if (status === 'waiting') {
    if (!args.counterpartyJoined) {
      return {
        label: 'Waiting',
        heading: `Waiting for ${counterpartyName} to join.`,
        update: 'Send them the link. They set their own limits privately, and never see yours.',
        nextStep: 'No action needed.',
        explanation: 'Nothing is sent until both sides have set a position.',
      }
    }
    if (!args.counterpartyReady) {
      return {
        label: 'Waiting',
        heading: `${counterpartyName} is setting their position.`,
        update: 'They are choosing their own limits. You will not see them, and they will not see yours.',
        nextStep: 'No action needed.',
        explanation: 'Your agent opens as soon as both positions are in.',
      }
    }
    return {
      label: 'Ready',
      heading: 'Both positions are in.',
      update: 'Your agent is preparing its opening offer.',
      nextStep: 'No action needed.',
      explanation: 'Offers are exchanged by email between the two agents.',
    }
  }

  if (status === 'settled') {
    return args.binding
      ? {
          label: 'Agreed',
          heading: 'Both of you confirmed.',
          update: 'The terms below are the ones you each agreed to.',
          nextStep: 'Nothing further is needed.',
          explanation: 'Neither side ever saw the other’s limits.',
        }
      : {
          label: 'Awaiting confirmation',
          heading: 'The agents reached terms.',
          update: 'Matching offers are not an agreement. Both of you still need to confirm.',
          nextStep: 'Review the terms and confirm if you are happy.',
          explanation: 'Your agent negotiated this; it has not agreed to anything on your behalf.',
        }
  }

  return {
    label: 'In progress',
    heading: `Your agent is working through ${counterpartyName}’s counteroffer.`,
    update:
      args.openTerms === 0
        ? 'Every term now matches. Confirmation is the last step.'
        : `${args.openTerms} ${args.openTerms === 1 ? 'term is' : 'terms are'} still open.`,
    nextStep: 'No action needed.',
    explanation: 'You can guide your agent at any point without changing your limits.',
  }
}

export function useLiveRoom(
  roomId: Id<'rooms'> | null,
  joinToken?: string,
): LiveRoom {
  const args = roomId === null ? 'skip' : ({ roomId, joinToken } as const)

  const room = useQuery(api.rooms.getRoom, args)
  const bounds = useQuery(api.bounds.myBounds, args)
  const rounds = useQuery(api.rounds.roomRounds, args)
  const agreement = useQuery(api.rounds.roomAgreement, args)

  const submitGuidance = useMutation(api.rounds.addIntervention)
  const confirm = useMutation(api.rounds.confirmAgreement)

  if (roomId === null) return { state: 'denied' }
  if (
    room === undefined ||
    bounds === undefined ||
    rounds === undefined ||
    agreement === undefined
  ) {
    return { state: 'loading' }
  }

  if (room.status === 'no_deal') {
    return {
      state: 'no-deal',
      dimension: room.noDealDimension ?? 'one of the terms',
      title: room.title,
    }
  }

  const mySide = room.mySide as Side
  const counterpartyName = room.counterpartyName ?? 'the other side'

  // Before both positions exist there is nothing to negotiate over, and the
  // room would render an empty comparison. Say what is missing instead.
  if (!room.myBoundsSubmitted) {
    return {
      state: 'setup',
      title: room.title,
      reason: 'Set your position to begin. Only you will ever see it.',
    }
  }

  const template = requireTemplate(room.templateId)

  const positions = new Map<string, PrivatePosition>()
  for (const bound of bounds) {
    const limit = bound.min ?? bound.max
    if (limit === undefined) continue
    positions.set(bound.dimensionKey, {
      limit,
      priority: toPriority(bound.weight),
      isHard: bound.isHard,
    })
  }

  const offers: PublicOffer[] = rounds.map((round) => ({
    id: `round-${round.index}`,
    round: round.index + 1,
    bySide: round.bySide as Side,
    createdAt: new Date(round.createdAt).toISOString(),
    rationale: round.rationale,
    terms: round.proposal as Record<string, number>,
    citations: round.citations.map((c) => ({
      url: c.url,
      title: c.title ?? new URL(c.url).hostname.replace(/^www\./, ''),
    })),
  }))

  const status = toStatus(room.status, offers.length)
  const finalOfferId = offers.length > 0 ? offers[offers.length - 1].id : 'final'

  const confirmations =
    agreement === null
      ? []
      : [
          ...(agreement.confirmedBySideA
            ? [{ id: 'confirm-a', proposalId: finalOfferId, bySide: 'a' as Side, createdAt: new Date(agreement.settledAt ?? Date.now()).toISOString() }]
            : []),
          ...(agreement.confirmedBySideB
            ? [{ id: 'confirm-b', proposalId: finalOfferId, bySide: 'b' as Side, createdAt: new Date(agreement.settledAt ?? Date.now()).toISOString() }]
            : []),
        ]

  const scenario: PublicScenario = { status, offers, confirmations }

  // Built from what this viewer can already see: the public offers, and their
  // own limit. Never from the counterparty's bounds, which are unreachable.
  const displayScales: Record<string, DisplayScale> = {}
  for (const dimension of template.dimensions) {
    const values: number[] = []
    for (const offer of offers) {
      const value = offer.terms[dimension.key]
      if (typeof value === 'number') values.push(value)
    }
    const own = positions.get(dimension.key)
    if (own !== undefined) values.push(own.limit)
    if (agreement !== null) {
      const settledValue = (agreement.terms as Record<string, number>)[dimension.key]
      if (typeof settledValue === 'number') values.push(settledValue)
    }
    displayScales[dimension.key] = deriveScale(values, { min: 0, max: 100 })
  }

  const openTerms = template.dimensions.filter((dimension) => {
    const mine = [...offers].reverse().find((o) => o.bySide === mySide)
    const theirs = [...offers].reverse().find((o) => o.bySide !== mySide)
    if (mine === undefined || theirs === undefined) return false
    return mine.terms[dimension.key] !== theirs.terms[dimension.key]
  }).length

  const data: RoomData = {
    template,
    mySide,
    room: {
      title: room.title,
      myName: room.myDisplayName,
      counterpartyName,
    },
    getMyPosition: (key) => positions.get(key),
    displayScales,
    scenario,
    briefing: briefingFor({
      status,
      counterpartyName,
      counterpartyJoined: room.counterpartyJoined,
      counterpartyReady: room.counterpartyBoundsSubmitted,
      openTerms,
      binding: agreement?.binding ?? false,
    }),
    actions: {
      submitGuidance: async (text: string) => {
        await submitGuidance({ roomId, joinToken, text })
      },
      confirmAgreement: async () => {
        await confirm({ roomId, joinToken })
      },
    },
  }

  return { state: 'ready', data }
}

export type { RoomData }
