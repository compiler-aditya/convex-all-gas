import { useId } from 'react'
import { cn } from 'cn'
import {
  formatValue,
  getLimitDirection,
  getPublicOfferDistance,
  scalePosition,
  type DimensionTrackProps,
} from './model'

export function DimensionTrack({
  dimension,
  scale,
  mySide,
  myPosition,
  state,
  accentOutcome = false,
}: DimensionTrackProps) {
  const id = useId()
  const direction = getLimitDirection(dimension, mySide)
  const limitPosition = scalePosition(myPosition.limit, scale)
  const isWaiting = state.status === 'waiting'
  const isSettled = state.status === 'settled'
  const distance = getPublicOfferDistance(state)
  const minimum = direction === 'minimum'
  const limitLabel = minimum ? 'Your floor' : 'Your ceiling'
  const rangeDescription = `Display scale: ${formatValue(dimension, scale.min)} to ${formatValue(dimension, scale.max)}.`

  return (
    <figure
      className="dimension-track"
      data-dimension={dimension.key}
      data-state={state.status}
      data-hard-limit={myPosition.isHard || undefined}
      aria-labelledby={`${id}-title`}
    >
      <figcaption className="flex items-baseline justify-between gap-2">
        <h3 id={`${id}-title`} className="font-medium">{dimension.label}</h3>
        <span className="track-status">
          {isSettled ? 'Settled' : isWaiting ? 'No offers yet' : distance === 0 ? 'Offers match' : (
            <><span className="font-mono tabular-nums">{formatValue(dimension, distance!)}</span> apart</>
          )}
        </span>
      </figcaption>

      <div className="track-plot-wrap">
        <div
          className="track-plot"
          role="img"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
        >
          <div
            className={cn('acceptable-region', minimum ? 'region-minimum' : 'region-maximum')}
            style={{
              left: `${minimum ? limitPosition : 0}%`,
              width: `${minimum ? 100 - limitPosition : limitPosition}%`,
            }}
            aria-hidden="true"
          />
          <div className="track-baseline" aria-hidden="true" />
          {[0, 25, 50, 75, 100].map((tick) => (
            <span className="track-tick" key={tick} style={{ left: `${tick}%` }} aria-hidden="true" />
          ))}
          <span
            className={cn('track-limit', myPosition.isHard && 'track-limit-fixed')}
            style={{ left: `${limitPosition}%` }}
            aria-hidden="true"
          />
          {!isWaiting && (
            <>
              <span
                className={cn('track-marker marker-yours', isSettled && 'marker-retired')}
                style={{ left: `${scalePosition(state.yourOffer, scale)}%` }}
                data-marker="your-offer"
                aria-hidden="true"
              />
              <span
                className={cn('track-marker marker-theirs', isSettled && 'marker-retired')}
                style={{ left: `${scalePosition(state.theirOffer, scale)}%` }}
                data-marker="their-offer"
                aria-hidden="true"
              />
            </>
          )}
          {isSettled && (
            <span
              className={cn('track-marker marker-settled', accentOutcome && 'marker-outcome')}
              style={{ left: `${scalePosition(state.finalValue, scale)}%` }}
              data-marker="settlement"
              data-outcome-accent={accentOutcome || undefined}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="track-scale font-mono tabular-nums" aria-hidden="true">
          <span>{formatValue(dimension, scale.min)}</span>
          <span>{formatValue(dimension, scale.max)}</span>
        </div>
      </div>

      <div className="track-values">
        {isWaiting ? (
          <p className="text-muted-foreground">waiting for the other side</p>
        ) : isSettled ? (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">Final value</span>
            <span className="font-mono font-medium tabular-nums">{formatValue(dimension, state.finalValue)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="legend-marker legend-theirs" aria-hidden="true" />
              <span className="sr-only">Their offer: </span>
              <span className="font-mono tabular-nums">{formatValue(dimension, state.theirOffer)}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="legend-marker legend-yours" aria-hidden="true" />
              <span className="sr-only">Your offer: </span>
              <span className="font-mono tabular-nums">{formatValue(dimension, state.yourOffer)}</span>
            </span>
          </div>
        )}
      </div>

      <p className="track-private-caption">
        <span className="flex flex-wrap items-baseline gap-x-1">
          <span>{limitLabel}</span>
          <span className="font-mono tabular-nums">{formatValue(dimension, myPosition.limit)}</span>
          {myPosition.isHard && <span className="fixed-caption">· fixed</span>}
        </span>
        <span className="whitespace-nowrap">yours · not sent</span>
      </p>
      <p id={`${id}-description`} className="sr-only">
        {rangeDescription} Your acceptable region is {minimum ? 'at or above' : 'at or below'}{' '}
        {formatValue(dimension, myPosition.limit)}. {myPosition.isHard ? 'Your limit is fixed. ' : ''}
        {isWaiting
          ? 'Waiting for the other side. Only your private region is shown.'
          : `Your public offer: ${formatValue(dimension, state.yourOffer)}. Their public offer: ${formatValue(dimension, state.theirOffer)}.`}
        {isSettled ? ` Final settlement: ${formatValue(dimension, state.finalValue)}.` : ''}
        {' No counterparty limits are shown or used.'}
      </p>
    </figure>
  )
}
