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
  | Readonly<{
      status: 'negotiating'
      yourOffer: number
      theirOffer: number
    }>
  | Readonly<{
      status: 'settled'
      yourOffer: number
      theirOffer: number
      finalValue: number
    }>

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

export type TermDelta = Readonly<{
  current: number
  previous: number | null
  difference: number | null
}>

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
})

export function formatFigure(value: number): string {
  return numberFormatter.format(value)
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
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(scale.min) ||
    !Number.isFinite(scale.max) ||
    scale.min >= scale.max
  ) {
    throw new Error('A track needs a finite value and an increasing display scale.')
  }
  return Math.max(0, Math.min(100, ((value - scale.min) / (scale.max - scale.min)) * 100))
}

export function getPublicOfferDistance(state: TrackState): number | null {
  if (state.status === 'waiting') return null
  return Math.abs(state.yourOffer - state.theirOffer)
}

export function getOfferDeltas(
  offer: PublicOffer,
  precedingOffers: ReadonlyArray<PublicOffer>,
): Record<string, TermDelta> {
  const previous = precedingOffers.findLast((candidate) => candidate.bySide === offer.bySide)
  return Object.fromEntries(
    Object.entries(offer.terms).map(([key, current]) => {
      const priorValue = previous?.terms[key] ?? null
      return [key, {
        current,
        previous: priorValue,
        difference: priorValue === null ? null : current - priorValue,
      }]
    }),
  )
}
