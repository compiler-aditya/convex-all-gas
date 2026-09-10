import { ArrowUp, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DimensionTrack } from './dimension-track'
import { displayScales, getMyPosition, getTrackState, mySide, template } from './fixtures'
import type { PreviewState } from './model'

export function GapPanel({ preview }: { preview: PreviewState }) {
  return (
    <aside className="gap-panel" aria-labelledby="gap-heading">
      <header className="column-heading">
        <div className="flex flex-col gap-1">
          <h2 id="gap-heading" className="section-label">The gap</h2>
          <p className="column-subtitle">Where the offers stand</p>
        </div>
      </header>
      <div className="gap-legend" aria-label="Track legend">
        <span className="flex items-center gap-2"><span className="legend-marker legend-theirs" aria-hidden="true" />Their offer</span>
        <span className="flex items-center gap-2"><span className="legend-marker legend-yours" aria-hidden="true" />Your offer</span>
        <span className="flex items-center gap-2"><span className="legend-limit" aria-hidden="true" />Your limit</span>
      </div>
      <div className="gap-tracks" tabIndex={0} role="region" aria-label="Negotiation dimension tracks">
        {template.dimensions.map((dimension, index) => (
          <DimensionTrack
            key={dimension.key}
            dimension={dimension}
            scale={displayScales[dimension.key]}
            mySide={mySide}
            myPosition={getMyPosition(dimension.key, preview)}
            state={getTrackState(dimension.key, preview)}
            accentOutcome={index === 0}
          />
        ))}
        <p className="track-reading-note">Shading shows your acceptable region, never theirs. Distances compare public offers only.</p>
      </div>
      <div className="agent-instruction-shell">
        <FieldGroup>
          <Field data-disabled aria-describedby="instruction-help">
            <FieldLabel htmlFor="agent-instruction"><LockKeyhole className="size-3" aria-hidden="true" />Tell your agent</FieldLabel>
            <div className="flex items-center gap-2">
              <Input id="agent-instruction" placeholder="e.g. I can start on Monday" disabled />
              <Button size="icon" disabled aria-label="Send private instruction"><ArrowUp aria-hidden="true" /></Button>
            </div>
            <FieldDescription id="instruction-help">Private instructions are disabled in this preview.</FieldDescription>
          </Field>
        </FieldGroup>
      </div>
    </aside>
  )
}
