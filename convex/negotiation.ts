import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { generateProposal } from "./engine/propose";
import {
  findBlockingDimension,
  utilityFor,
  validateAgainstOwnBounds,
  type Bound,
  type Proposal,
  type Side,
} from "./engine/scoring";
import { activeModelId } from "./lib/model";
import { requireTemplate } from "./templates";

/**
 * The round loop.
 *
 * Sides alternate, starting with side A. Each round the server first asks
 * whether the standing offer is already acceptable — deterministically, from
 * the bounds — and only generates a counter if it is not. Acceptance is never
 * left to the model: a predictable rule is both safer and far easier to film.
 */

/** Accept when the standing offer clears this share of the agreement zone. */
const ACCEPT_UTILITY = 0.45;

const asBounds = (rows: Array<{
  dimensionKey: string;
  min?: number;
  max?: number;
  preferred?: number;
  weight: number;
  isHard: boolean;
}>): Bound[] => rows;

export const roundContext = internalQuery({
  args: { roomId: v.id("rooms") },
  returns: v.union(
    v.null(),
    v.object({
      templateId: v.string(),
      status: v.string(),
      currentRound: v.number(),
      maxRounds: v.number(),
      boundsA: v.any(),
      boundsB: v.any(),
      grounding: v.any(),
      history: v.any(),
      interventionsA: v.array(v.string()),
      interventionsB: v.array(v.string()),
      bothSubmitted: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (room === null) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(2);
    const pa = participants.find((p) => p.side === "a");
    const pb = participants.find((p) => p.side === "b");

    const loadBounds = async (participantId?: Id<"participants">) => {
      if (participantId === undefined) return [];
      const rows = await ctx.db
        .query("bounds")
        .withIndex("by_participant", (q) => q.eq("participantId", participantId))
        .take(100);
      return rows.map((r) => ({
        dimensionKey: r.dimensionKey,
        min: r.min,
        max: r.max,
        preferred: r.preferred,
        weight: r.weight,
        isHard: r.isHard,
      }));
    };

    const grounding = await ctx.db
      .query("grounding")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(20);

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room_index", (q) => q.eq("roomId", args.roomId))
      .take(50);

    const interventions = await ctx.db
      .query("interventions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(50);

    return {
      templateId: room.templateId,
      status: room.status,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      boundsA: await loadBounds(pa?._id),
      boundsB: await loadBounds(pb?._id),
      grounding: grounding.map((g) => ({
        id: g._id,
        kind: g.kind,
        title: g.title,
        sourceUrl: g.sourceUrl,
        snippet: g.snippet,
      })),
      history: rounds
        .sort((x, y) => x.index - y.index)
        .map((r) => ({
          index: r.index,
          bySide: r.bySide,
          proposal: r.proposal as Proposal,
          rationale: r.rationale,
        })),
      interventionsA: interventions
        .filter((i) => i.participantId === pa?._id)
        .map((i) => i.text),
      interventionsB: interventions
        .filter((i) => i.participantId === pb?._id)
        .map((i) => i.text),
      bothSubmitted:
        pa?.boundsSubmittedAt !== undefined && pb?.boundsSubmittedAt !== undefined,
    };
  },
});

export const recordRound = internalMutation({
  args: {
    roomId: v.id("rooms"),
    index: v.number(),
    bySide: v.union(v.literal("a"), v.literal("b")),
    proposal: v.any(),
    rationale: v.string(),
    citedGroundingIds: v.array(v.id("grounding")),
    utilityForProposer: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("rounds", {
      roomId: args.roomId,
      index: args.index,
      bySide: args.bySide,
      proposal: args.proposal,
      rationale: args.rationale,
      citedGroundingIds: args.citedGroundingIds,
      utilityForProposer: args.utilityForProposer,
    });
    await ctx.db.patch("rooms", args.roomId, {
      status: "negotiating",
      currentRound: args.index + 1,
    });
    return null;
  },
});

export const concludeRoom = internalMutation({
  args: {
    roomId: v.id("rooms"),
    outcome: v.union(v.literal("agreed"), v.literal("no_deal")),
    blockingDimension: v.optional(v.string()),
    terms: v.optional(v.any()),
    citedGroundingIds: v.optional(v.array(v.id("grounding"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("rooms", args.roomId, {
      status: args.outcome,
      closedAt: Date.now(),
      noDealDimension: args.blockingDimension,
    });

    if (args.outcome === "agreed" && args.terms !== undefined) {
      // Agents converged; the humans still have to say yes. Nothing here binds
      // anyone — both confirmation flags start false by design.
      await ctx.db.insert("agreements", {
        roomId: args.roomId,
        terms: args.terms,
        citedGroundingIds: args.citedGroundingIds ?? [],
        confirmedBySideA: false,
        confirmedBySideB: false,
      });
    }
    return null;
  },
});

export type RoundOutcome =
  | { kind: "proposed"; index: number; side: Side }
  | { kind: "agreed"; index: number; side: Side }
  | { kind: "no_deal"; dimension: string }
  | { kind: "halted"; reason: string };

/**
 * Run exactly one round.
 *
 * `deliver` chooses which loop drives the negotiation. Offline, the caller
 * loops and no email is sent. With delivery, this schedules the round as an
 * email and the inbound webhook triggers the next round — so exactly one thing
 * advances the negotiation and the two modes never both run.
 */
export const runRound = internalAction({
  args: { roomId: v.id("rooms"), deliver: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, args): Promise<RoundOutcome> => {
    const context = await ctx.runQuery(internal.negotiation.roundContext, {
      roomId: args.roomId,
    });
    if (context === null) throw new Error("Room not found");
    if (!context.bothSubmitted) {
      return { kind: "halted", reason: "both sides must submit bounds first" };
    }
    if (context.status === "agreed" || context.status === "no_deal") {
      return { kind: "halted", reason: `already ${context.status}` };
    }

    const template = requireTemplate(context.templateId);
    const boundsA = asBounds(context.boundsA);
    const boundsB = asBounds(context.boundsB);

    // Cheap and certain: if the ranges cannot meet, say so before spending a
    // model call pretending otherwise.
    const blocking = findBlockingDimension(template, boundsA, boundsB);
    if (blocking !== null) {
      await ctx.runMutation(internal.negotiation.concludeRoom, {
        roomId: args.roomId,
        outcome: "no_deal",
        blockingDimension: blocking.label,
      });
      return { kind: "no_deal", dimension: blocking.label };
    }

    const index = context.currentRound;
    if (index >= context.maxRounds) {
      await ctx.runMutation(internal.negotiation.concludeRoom, {
        roomId: args.roomId,
        outcome: "no_deal",
        blockingDimension: "rounds exhausted",
      });
      return { kind: "no_deal", dimension: "rounds exhausted" };
    }

    const side: Side = index % 2 === 0 ? "a" : "b";
    const ownBounds = side === "a" ? boundsA : boundsB;
    const history = context.history as Array<{
      index: number;
      bySide: Side;
      proposal: Proposal;
      rationale: string;
    }>;

    // Does the standing offer already work for this side? Decided from bounds,
    // not by asking the model whether it feels satisfied.
    const standing = [...history].reverse().find((r) => r.bySide !== side);
    if (standing !== undefined) {
      const breaks = validateAgainstOwnBounds({
        template,
        side,
        proposal: standing.proposal,
        ownBounds,
      });
      const utility = utilityFor({
        template,
        side,
        proposal: standing.proposal,
        boundsA,
        boundsB,
      });
      const roundsLeft = context.maxRounds - index;
      const goodEnough = utility >= ACCEPT_UTILITY || roundsLeft <= 1;

      if (breaks.length === 0 && goodEnough) {
        await ctx.runMutation(internal.negotiation.concludeRoom, {
          roomId: args.roomId,
          outcome: "agreed",
          terms: standing.proposal,
          citedGroundingIds: [],
        });
        return { kind: "agreed", index, side };
      }
    }

    const generated = await generateProposal({
      model: await activeModelId(),
      template,
      side,
      ownBounds,
      grounding: context.grounding,
      history,
      interventions: side === "a" ? context.interventionsA : context.interventionsB,
    });

    const utility = utilityFor({
      template,
      side,
      proposal: generated.proposal,
      boundsA,
      boundsB,
    });

    await ctx.runMutation(internal.negotiation.recordRound, {
      roomId: args.roomId,
      index,
      bySide: side,
      proposal: generated.proposal,
      rationale: generated.rationale,
      citedGroundingIds: generated.citedGroundingIds as Id<"grounding">[],
      utilityForProposer: utility,
    });

    if (args.deliver === true) {
      // Scheduled rather than awaited: the round is committed either way, so a
      // provider outage delays delivery instead of losing the offer.
      await ctx.scheduler.runAfter(0, internal.email.sendRoundEmail, {
        roomId: args.roomId,
        roundIndex: index,
      });
    }

    return { kind: "proposed", index, side };
  },
});

/** Run rounds until the negotiation concludes. */
export const runNegotiation = internalAction({
  args: { roomId: v.id("rooms"), maxSteps: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args): Promise<{ steps: number; outcome: RoundOutcome }> => {
    const limit = args.maxSteps ?? 12;
    let last: RoundOutcome = { kind: "halted", reason: "no rounds run" };

    for (let step = 0; step < limit; step++) {
      last = await ctx.runAction(internal.negotiation.runRound, {
        roomId: args.roomId,
        deliver: false,
      });
      if (last.kind !== "proposed") {
        return { steps: step + 1, outcome: last };
      }
    }
    return { steps: limit, outcome: last };
  },
});
