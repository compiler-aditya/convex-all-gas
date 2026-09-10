// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { displayScales, finalProposal, getMyPosition, myPositions, mySide, offers, scenarios, template } from './fixtures'
import { createRoomSession, getConfirmedProposal, getLatestOffers, getOfferDeltas, getOfferHistory, getPublicActivity, getPublicOfferDistance, getTermComparisons, getTrackState, guidanceCharacterLimit, roomReducer, scalePosition, type PreviewState } from './model'

describe('public offer history', () => {
  it('compares each offer only with that side’s chronological predecessor', () => {
    const delta = getOfferDeltas(offers[3], offers.slice(0, 3))
    expect(delta.rate).toEqual({ current: 115000, previous: 105000, difference: 10000 })
    expect(delta.upfrontPercent).toEqual({ current: 40, previous: 30, difference: 10 })
    expect(delta.scopeUnits.difference).toBe(0)
    expect(getOfferDeltas(offers[2], offers.slice(0, 2)).rate.previous).toBe(135000)
  })

  it('marks both sides’ first offers as opening offers', () => {
    expect(getOfferDeltas(offers[0], []).rate.previous).toBeNull()
    expect(getOfferDeltas(offers[1], [offers[0]]).rate.difference).toBeNull()
  })

  it('returns newest-first history without changing inputs or corrupting deltas', () => {
    const shuffled = [offers[2], offers[0], offers[3], offers[1]]
    const snapshot = [...shuffled]
    const history = getOfferHistory(shuffled)
    expect(history.map(({ offer }) => offer.id)).toEqual(['offer-4', 'offer-3', 'offer-2', 'offer-1'])
    expect(history[0].deltas.rate.difference).toBe(10000)
    expect(history[1].deltas.rate.difference).toBe(-10000)
    expect(shuffled).toEqual(snapshot)
  })

  it('selects the latest offers independent of input order', () => {
    const latest = getLatestOffers([...offers].reverse(), mySide)
    expect(latest.yours?.id).toBe('offer-3')
    expect(latest.theirs?.id).toBe('offer-4')
  })

  it('builds factual activity from public changes, newest first', () => {
    const activity = getPublicActivity(scenarios.negotiating, template.dimensions, mySide, 'Maya', 'Devin')
    expect(activity[0].title).toBe('Devin increased their offer by ₹10,000.')
    expect(activity[1].title).toBe('Your agent reduced the fee by ₹10,000.')
    expect(activity[0].detail).toContain('40%')
    expect(JSON.stringify(activity)).not.toContain('110000')
    expect(JSON.stringify(activity)).not.toContain('priority')
  })
})

describe('deal comparisons and explicit settlement', () => {
  it('separates the two unresolved terms from the three matching terms', () => {
    const terms = getTermComparisons(template.dimensions, offers, mySide)
    expect(terms.filter((term) => !term.matches).map((term) => term.dimension.key)).toEqual(['rate', 'deliveryDays'])
    expect(terms.filter((term) => term.matches)).toHaveLength(3)
    expect(getConfirmedProposal(scenarios.negotiating)).toBeUndefined()
  })

  it('never invents comparisons or tracks for absent offers', () => {
    expect(getOfferHistory([])).toEqual([])
    expect(getLatestOffers([], mySide)).toEqual({ yours: undefined, theirs: undefined })
    expect(getTermComparisons(template.dimensions, [], mySide)).toEqual([])
    expect(getTermComparisons(template.dimensions, [offers[0]], mySide)).toEqual([])
    expect(getTrackState('rate', scenarios.waiting, mySide)).toEqual({ status: 'waiting' })
    expect(getPublicOfferDistance({ status: 'waiting' })).toBeNull()
    expect(getPublicActivity(scenarios.waiting, template.dimensions, mySide, 'Maya', 'Devin')).toEqual([])
  })

  it('does not interpret matching terms as confirmation', () => {
    const matchingButUnconfirmed = { ...scenarios.settled, status: 'negotiating' as const, confirmations: [] }
    expect(getTermComparisons(template.dimensions, matchingButUnconfirmed.offers, mySide).every((term) => term.matches)).toBe(true)
    expect(getConfirmedProposal(matchingButUnconfirmed)).toBeUndefined()
    expect(getTrackState('rate', matchingButUnconfirmed, mySide).status).toBe('negotiating')
  })

  it('requires both participants to confirm the same latest proposal', () => {
    expect(getConfirmedProposal(scenarios.settled)).toEqual(finalProposal)
    expect(getConfirmedProposal({ ...scenarios.settled, confirmations: scenarios.settled.confirmations.slice(0, 1) })).toBeUndefined()
    expect(getConfirmedProposal({ ...scenarios.settled, confirmations: scenarios.settled.confirmations.map((event) => ({ ...event, bySide: 'a' as const })) })).toBeUndefined()
    expect(getConfirmedProposal({ ...scenarios.settled, confirmations: scenarios.settled.confirmations.map((event) => ({ ...event, proposalId: 'offer-1' })) })).toBeUndefined()
    expect(getConfirmedProposal({ ...scenarios.settled, confirmations: scenarios.settled.confirmations.map((event) => ({ ...event, createdAt: '2026-09-10T10:00:00Z' })) })).toBeUndefined()
  })

  it('keeps the final terms, latest offers, tracks, and confirmation history consistent', () => {
    const { yours, theirs } = getLatestOffers(scenarios.settled.offers, mySide)
    expect(yours?.terms).toEqual(finalProposal.terms)
    expect(theirs?.terms).toEqual(finalProposal.terms)
    for (const dimension of template.dimensions) {
      const value = finalProposal.terms[dimension.key]
      expect(getTrackState(dimension.key, scenarios.settled, mySide)).toEqual({ status: 'settled', yourOffer: value, theirOffer: value, finalValue: value })
    }
    const activity = getPublicActivity(scenarios.settled, template.dimensions, mySide, 'Maya', 'Devin')
    expect(activity.slice(0, 2).map((event) => event.kind)).toEqual(['confirmation', 'confirmation'])
    expect(activity.at(2)?.id).toBe(finalProposal.id)
  })
})

describe('private boundaries', () => {
  it('uses a counteroffer below the fixed fee floor in the hard-limit scenario', () => {
    const fee = getMyPosition('rate', 'hard-limit')
    const { theirs } = getLatestOffers(scenarios['hard-limit'].offers, mySide)
    expect(fee.isHard).toBe(true)
    expect(theirs?.terms.rate).toBeLessThan(fee.limit)
    expect(myPositions.rate.isHard).toBe(false)
    expect(getPublicOfferDistance(getTrackState('rate', scenarios['hard-limit'], mySide))).toBe(17000)
    expect(getPublicActivity(scenarios['hard-limit'], template.dimensions, mySide, 'Maya', 'Devin')[0].title).toContain('₹3,000')
  })

  it('uses fixed public scales in every scenario', () => {
    const scale = { min: 80000, max: 160000 }
    expect(displayScales.rate).toEqual(scale)
    expect(scalePosition(120000, scale)).toBe(50)
    expect(scalePosition(200000, scale)).toBe(100)
    expect(scalePosition(10000, scale)).toBe(0)
    expect(() => scalePosition(10, { min: 10, max: 10 })).toThrow()
    expect(() => scalePosition(Number.NaN, scale)).toThrow()
  })

  it('keeps public scenarios free of private-position properties', () => {
    for (const scenario of Object.values(scenarios)) {
      expect(Object.keys(scenario).sort()).toEqual(['confirmations', 'offers', 'status'])
      expect(JSON.stringify(scenario)).not.toMatch(/myPosition|theirPosition|priority|isHard|guidance|privateLimit/)
    }
  })
})

describe('local demo guidance and scenario resets', () => {
  it('rejects whitespace-only notes and validates the character limit', () => {
    const empty = roomReducer({ ...createRoomSession(), guidanceDraft: ' \n ' }, { type: 'guidance-add' })
    expect(empty.notes).toEqual([])
    expect(empty.guidanceError).toBe('Write a note before adding it.')
    const tooLong = roomReducer({ ...createRoomSession(), guidanceDraft: 'a'.repeat(guidanceCharacterLimit + 1) }, { type: 'guidance-add' })
    expect(tooLong.notes).toEqual([])
    expect(tooLong.guidanceError).not.toBeNull()
  })

  it('keeps notes private without altering offers or fixed limits', () => {
    const publicBefore = JSON.stringify(scenarios)
    const privateBefore = JSON.stringify(myPositions)
    const next = roomReducer({ ...createRoomSession('hard-limit'), guidanceDraft: '  I can start on Monday.  ' }, { type: 'guidance-add' })
    expect(next.notes).toEqual(['I can start on Monday.'])
    expect(next.guidanceDraft).toBe('')
    expect(JSON.stringify(scenarios)).toBe(publicBefore)
    expect(JSON.stringify(myPositions)).toBe(privateBefore)
  })

  it.each<PreviewState>(['waiting', 'negotiating', 'hard-limit', 'settled'])('resets notes, drafts, errors, sheets and disclosures for %s', (scenario) => {
    const dirty = { ...createRoomSession(), notes: ['Private note'], guidanceDraft: 'Unfinished note', guidanceError: 'Error', guidanceOpen: true, sheet: 'history' as const, expandedTerms: ['rate'], expandedOffers: ['offer-4'] }
    expect(roomReducer(dirty, { type: 'scenario', value: scenario })).toEqual(createRoomSession(scenario))
  })
})
