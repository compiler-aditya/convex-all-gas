import { useId } from 'react'
import { LockKeyhole } from 'lucide-react'
import { cn } from 'cn'
import { formatValue, getLimitDirection, getPublicOfferDistance, scalePosition, type DimensionTrackProps } from './model'

export function DimensionTrack({ dimension, scale, mySide, myPosition, state, accentOutcome = false }: DimensionTrackProps) {
  const id = useId()
  const limitPosition = scalePosition(myPosition.limit, scale)
  const isWaiting = state.status === 'waiting'
  const isSettled = state.status === 'settled'
  const distance = getPublicOfferDistance(state)
  const minimum = getLimitDirection(dimension, mySide) === 'minimum'

  return (
    <figure className="dimension-track" data-dimension={dimension.key} data-state={state.status} data-hard-limit={myPosition.isHard || undefined} aria-labelledby={`${id}-title`}>
      <figcaption className="track-caption">
        <span id={`${id}-title`}>{dimension.label} comparison</span>
        <span className="track-status">{isSettled ? 'Confirmed' : isWaiting ? 'No offers yet' : distance === 0 ? 'Offers match' : `${formatValue(dimension, distance!)} apart`}</span>
      </figcaption>
      <div className="track-plot-wrap">
        <div className="track-plot" role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
          <div className={cn('acceptable-region', minimum ? 'region-minimum' : 'region-maximum')} style={{ left: `${minimum ? limitPosition : 0}%`, width: `${minimum ? 100 - limitPosition : limitPosition}%` }} aria-hidden="true" />
          <div className="track-baseline" aria-hidden="true" />
          {[0, 25, 50, 75, 100].map((tick) => <span className="track-tick" key={tick} style={{ left: `${tick}%` }} aria-hidden="true" />)}
          <span className={cn('track-limit', myPosition.isHard && 'track-limit-fixed')} style={{ left: `${limitPosition}%` }} aria-hidden="true" />
          {!isWaiting && (
            <>
              <span className={cn('track-marker marker-yours', isSettled && 'marker-retired')} style={{ left: `${scalePosition(state.yourOffer, scale)}%` }} data-marker="your-offer" aria-hidden="true" />
              <span className={cn('track-marker marker-theirs', isSettled && 'marker-retired')} style={{ left: `${scalePosition(state.theirOffer, scale)}%` }} data-marker="their-offer" aria-hidden="true" />
            </>
          )}
          {isSettled && <span className={cn('track-marker marker-settled', accentOutcome && 'marker-outcome')} style={{ left: `${scalePosition(state.finalValue, scale)}%` }} data-marker="settlement" aria-hidden="true" />}
        </div>
        <div className="track-scale tabular-nums" aria-hidden="true"><span>{formatValue(dimension, scale.min)}</span><span>{formatValue(dimension, scale.max)}</span></div>
      </div>
      <div className="track-legend" aria-label="Track legend">
        <span><span className="legend-marker legend-yours" aria-hidden="true" />Your offer</span>
        <span><span className="legend-marker legend-theirs" aria-hidden="true" />Other offer</span>
        <span><span className="legend-limit" aria-hidden="true" />Your limit</span>
      </div>
      <p className="track-private-caption"><LockKeyhole className="size-4" aria-hidden="true" /><span>Your {minimum ? 'minimum' : 'maximum'}: <strong className="tabular-nums">{formatValue(dimension, myPosition.limit)}</strong>{myPosition.isHard ? ' · fixed' : ''}</span></p>
      <p className="track-reading-note">Private to you. Shading shows only your acceptable region.</p>
      <p id={`${id}-description`} className="sr-only">
        Display scale: {formatValue(dimension, scale.min)} to {formatValue(dimension, scale.max)}. Your acceptable region is {minimum ? 'at or above' : 'at or below'} {formatValue(dimension, myPosition.limit)}. {myPosition.isHard ? 'Your limit is fixed. ' : ''}
        {isWaiting ? 'Waiting for the other side. Only your private region is shown.' : `Your public offer: ${formatValue(dimension, state.yourOffer)}. Their public offer: ${formatValue(dimension, state.theirOffer)}.`}
        {isSettled ? ` Final confirmed value: ${formatValue(dimension, state.finalValue)}.` : ''}
        {' No counterparty limits are shown or used.'}
      </p>
    </figure>
  )
}
