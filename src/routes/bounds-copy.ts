import type { Dimension } from '../../convex/templates/types'

/**
 * How to ask a person for one of their private limits.
 *
 * Which direction a person is protected in is a property of their side, not of
 * the dimension, so the caller passes it in: `minimum` means they are held up
 * by a floor, otherwise they are held down by a ceiling.
 *
 * Templates carry their own phrasing where the natural question is worth
 * writing ("What is the most you would pay?"). The generic fallback exists so a
 * new template works the moment its dimensions are defined, without anyone
 * having to write ten strings first.
 */
export function questionFor(dimension: Dimension, minimum: boolean): string {
  const custom = minimum ? dimension.askMin : dimension.askMax
  if (custom !== undefined) return custom
  const noun = dimension.label.toLowerCase()
  return minimum
    ? `What is the lowest ${noun} you would accept?`
    : `What is the highest ${noun} you would accept?`
}
