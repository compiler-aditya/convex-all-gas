import type { Dimension, Template } from "../templates";

/**
 * Scoring and overlap detection.
 *
 * Pure functions, no database and no model. This is where the product's claim
 * actually lives: given two sets of private limits, is there a deal, and how
 * good is a given proposal for each side.
 */

export type Bound = {
  dimensionKey: string;
  min?: number;
  max?: number;
  preferred?: number;
  weight: number;
  isHard: boolean;
};

export type Proposal = Record<string, number>;
export type Side = "a" | "b";

export type Zone = {
  /** Lowest value the favoured side will accept. */
  floor: number;
  /** Highest value the other side will accept. */
  ceiling: number;
};

const byKey = (bounds: Bound[]): Map<string, Bound> =>
  new Map(bounds.map((b) => [b.dimensionKey, b]));

/**
 * The zone of possible agreement for one dimension.
 *
 * On every dimension one side wants the number higher and the other wants it
 * lower. The side favoured by "higher" contributes the floor; the other
 * contributes the ceiling. A deal exists on that dimension when floor <= ceiling.
 *
 * Returns null when either side left the dimension unbounded (anything goes) —
 * that is not a conflict, so it must not be reported as one.
 */
export function zoneFor(
  dimension: Dimension,
  boundA: Bound | undefined,
  boundB: Bound | undefined,
): Zone | null {
  const favoured = dimension.higherFavors;
  const favouredBound = favoured === "a" ? boundA : boundB;
  const otherBound = favoured === "a" ? boundB : boundA;

  const floor = favouredBound?.min;
  const ceiling = otherBound?.max;
  if (floor === undefined || ceiling === undefined) return null;
  return { floor, ceiling };
}

export type NoDeal = {
  dimensionKey: string;
  label: string;
};

/**
 * The first dimension on which no agreement is possible, if any.
 *
 * Reports the dimension only. The whole point is that neither side learns the
 * other's numbers, so "no zone on rate" is the most that may ever be said —
 * never "their ceiling is below your floor by 4,000".
 */
export function findBlockingDimension(
  template: Template,
  boundsA: Bound[],
  boundsB: Bound[],
): NoDeal | null {
  const a = byKey(boundsA);
  const b = byKey(boundsB);

  for (const dimension of template.dimensions) {
    const zone = zoneFor(dimension, a.get(dimension.key), b.get(dimension.key));
    if (zone === null) continue;
    if (zone.floor > zone.ceiling) {
      return { dimensionKey: dimension.key, label: dimension.label };
    }
  }
  return null;
}

/**
 * How satisfied one side is with a value, in 0..1.
 *
 * Normalised across the agreement zone so both sides are measured on the same
 * scale: at the floor the favoured side scores 0 and the other scores 1, and
 * vice versa at the ceiling. Without a zone there is nothing to normalise
 * against, so an in-bounds value scores a neutral 0.5 rather than a fabricated
 * precision.
 */
export function satisfaction(
  dimension: Dimension,
  side: Side,
  value: number,
  zone: Zone | null,
): number {
  if (zone === null) return 0.5;
  const span = zone.ceiling - zone.floor;
  if (span <= 0) return 1;

  const clamped = Math.min(Math.max(value, zone.floor), zone.ceiling);
  const fromFloor = (clamped - zone.floor) / span;
  return dimension.higherFavors === side ? fromFloor : 1 - fromFloor;
}

/**
 * Weighted utility of a whole proposal for one side, in 0..1.
 *
 * Weights are the priorities each person set. Dimensions they left unweighted
 * or unmentioned contribute nothing, so a side that only cares about rate is
 * scored on rate.
 */
export function utilityFor(args: {
  template: Template;
  side: Side;
  proposal: Proposal;
  boundsA: Bound[];
  boundsB: Bound[];
}): number {
  const a = byKey(args.boundsA);
  const b = byKey(args.boundsB);
  const own = args.side === "a" ? a : b;

  let weighted = 0;
  let totalWeight = 0;

  for (const dimension of args.template.dimensions) {
    const value = args.proposal[dimension.key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;

    const weight = own.get(dimension.key)?.weight ?? 0;
    if (weight <= 0) continue;

    const zone = zoneFor(dimension, a.get(dimension.key), b.get(dimension.key));
    weighted += weight * satisfaction(dimension, args.side, value, zone);
    totalWeight += weight;
  }

  return totalWeight === 0 ? 0 : weighted / totalWeight;
}

export type Violation = {
  dimensionKey: string;
  label: string;
  reason: string;
};

/**
 * Check a proposal against the *proposer's own* limits.
 *
 * This is the trust boundary. The model proposes; this decides. A model that
 * hallucinates past its own side's floor is caught here, before the number can
 * become an email or an agreement. Nothing downstream re-checks it, so this
 * must stay strict.
 */
export function validateAgainstOwnBounds(args: {
  template: Template;
  side: Side;
  proposal: Proposal;
  ownBounds: Bound[];
}): Violation[] {
  const own = byKey(args.ownBounds);
  const violations: Violation[] = [];

  for (const dimension of args.template.dimensions) {
    const value = args.proposal[dimension.key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;

    const bound = own.get(dimension.key);
    if (bound === undefined) continue;

    const favoursMe = dimension.higherFavors === args.side;
    // The side favoured by "higher" is protected by its floor; the other by its
    // ceiling. Proposing something better for yourself is always allowed.
    if (favoursMe && bound.min !== undefined && value < bound.min) {
      violations.push({
        dimensionKey: dimension.key,
        label: dimension.label,
        reason: `below your own minimum for ${dimension.label}`,
      });
    }
    if (!favoursMe && bound.max !== undefined && value > bound.max) {
      violations.push({
        dimensionKey: dimension.key,
        label: dimension.label,
        reason: `above your own maximum for ${dimension.label}`,
      });
    }
  }

  return violations;
}

/**
 * Dimensions where this side has room to give.
 *
 * Multi-axis trading is what makes agents better than people at this: humans
 * argue one number, agents concede where it is cheap and hold where it is not.
 * Slack is how far a value can move toward the counterparty before hitting this
 * side's own limit, scaled by how little they care.
 */
export function slackByDimension(args: {
  template: Template;
  side: Side;
  proposal: Proposal;
  ownBounds: Bound[];
}): Array<{ dimensionKey: string; label: string; room: number; weight: number }> {
  const own = byKey(args.ownBounds);
  const result: Array<{
    dimensionKey: string;
    label: string;
    room: number;
    weight: number;
  }> = [];

  for (const dimension of args.template.dimensions) {
    const value = args.proposal[dimension.key];
    const bound = own.get(dimension.key);
    if (typeof value !== "number" || bound === undefined || bound.isHard) continue;

    const favoursMe = dimension.higherFavors === args.side;
    const limit = favoursMe ? bound.min : bound.max;
    if (limit === undefined) continue;

    const room = favoursMe ? value - limit : limit - value;
    if (room > 0) {
      result.push({
        dimensionKey: dimension.key,
        label: dimension.label,
        room,
        weight: bound.weight,
      });
    }
  }

  // Cheapest concessions first: most room, least cared about.
  return result.sort((x, y) => x.weight - y.weight || y.room - x.room);
}
