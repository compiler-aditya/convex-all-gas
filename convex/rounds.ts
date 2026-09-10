import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  mutation,
  query,
} from "./_generated/server";
import { requireParticipant } from "./lib/access";

/**
 * The public surface the interface binds to.
 *
 * Rounds, citations and agreements are shared: both sides negotiated them and
 * both may read them. Interventions are not — an instruction to your own agent
 * is private, so `myInterventions` is scoped to the caller the same way bounds
 * are.
 *
 * Nothing here exposes the counterparty's limits, and nothing accepts a
 * participant id from the client. Callers are resolved server-side by session
 * or join token.
 */

const citation = v.object({
  url: v.string(),
  title: v.optional(v.string()),
});

/** The shared record of offers, oldest first. Readable by both participants. */
export const roomRounds = query({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      index: v.number(),
      bySide: v.union(v.literal("a"), v.literal("b")),
      proposal: v.any(),
      rationale: v.string(),
      citations: v.array(citation),
      createdAt: v.number(),
      /** Whether this offer actually went out as mail. */
      delivered: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireParticipant(ctx, args);

    const rows = await ctx.db
      .query("rounds")
      .withIndex("by_room_index", (q) => q.eq("roomId", args.roomId))
      .take(50);

    const ordered = rows.sort((x, y) => x.index - y.index);
    const result = [];
    for (const round of ordered) {
      const citations = [];
      for (const id of round.citedGroundingIds) {
        const source = await ctx.db.get("grounding", id);
        if (source !== null) {
          citations.push({ url: source.sourceUrl, title: source.title });
        }
      }
      result.push({
        index: round.index,
        bySide: round.bySide,
        proposal: round.proposal,
        rationale: round.rationale,
        citations,
        createdAt: round._creationTime,
        delivered: round.emailMessageId !== undefined,
      });
    }
    return result;
  },
});

/** The settled terms, if the agents converged. Null until then. */
export const roomAgreement = query({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      terms: v.any(),
      citations: v.array(citation),
      confirmedBySideA: v.boolean(),
      confirmedBySideB: v.boolean(),
      settledAt: v.optional(v.number()),
      /** True only when both sides have confirmed. */
      binding: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireParticipant(ctx, args);

    const agreement = await ctx.db
      .query("agreements")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (agreement === null) return null;

    const citations = [];
    for (const id of agreement.citedGroundingIds) {
      const source = await ctx.db.get("grounding", id);
      if (source !== null) {
        citations.push({ url: source.sourceUrl, title: source.title });
      }
    }

    return {
      terms: agreement.terms,
      citations,
      confirmedBySideA: agreement.confirmedBySideA,
      confirmedBySideB: agreement.confirmedBySideB,
      settledAt: agreement.settledAt,
      binding: agreement.confirmedBySideA && agreement.confirmedBySideB,
    };
  },
});

/**
 * The caller's own instructions to their agent.
 *
 * Private, like bounds. Telling your agent "I'll go to 60% upfront if she starts
 * Monday" is a disclosure of your position, so it belongs on your side of the
 * screen and nowhere near the shared record.
 */
export const myInterventions = query({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      text: v.string(),
      appliedAtRound: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const { participant } = await requireParticipant(ctx, args);
    const rows = await ctx.db
      .query("interventions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(50);
    return rows
      .filter((row) => row.participantId === participant._id)
      .map((row) => ({
        text: row.text,
        appliedAtRound: row.appliedAtRound,
        createdAt: row._creationTime,
      }));
  },
});

/**
 * Begin the negotiation: gather evidence, then make the opening offer.
 *
 * Grounding runs first so the first offer can already cite something. Failure
 * to ground is not fatal — a negotiation without market evidence is worse but
 * still valid, and blocking on a third-party scrape would be a poor trade.
 */
export const beginNegotiation = internalAction({
  args: { roomId: v.id("rooms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      await ctx.runAction(internal.grounding.groundRoom, {
        roomId: args.roomId,
      });
    } catch (error) {
      console.warn(
        `[begin] grounding failed, continuing without evidence: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    await ctx.runAction(internal.negotiation.runRound, {
      roomId: args.roomId,
      deliver: true,
    });
    return null;
  },
});

/** Start the negotiation. Requires both sides to have locked in a position. */
export const startNegotiation = mutation({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
  },
  returns: v.object({ started: v.boolean(), reason: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const { room } = await requireParticipant(ctx, args);

    if (room.status === "negotiating" || room.status === "grounding") {
      return { started: false, reason: "already running" };
    }
    if (room.status === "agreed" || room.status === "no_deal") {
      return { started: false, reason: `already ${room.status}` };
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(2);
    if (participants.length < 2) {
      return { started: false, reason: "the other side has not joined yet" };
    }
    if (participants.some((p) => p.boundsSubmittedAt === undefined)) {
      return {
        started: false,
        reason: "both sides must set their position first",
      };
    }

    await ctx.runMutation(internal.email.assignInboxes, {
      roomId: args.roomId,
    });
    await ctx.db.patch("rooms", args.roomId, { status: "grounding" });
    await ctx.scheduler.runAfter(0, internal.rounds.beginNegotiation, {
      roomId: args.roomId,
    });

    return { started: true };
  },
});

/**
 * Tell your own agent something mid-negotiation.
 *
 * Applied from the next round onward — the engine reads this side's
 * instructions when building its prompt. Recorded against the current round so
 * the interface can show when it was given.
 */
export const addIntervention = mutation({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
    text: v.string(),
  },
  returns: v.object({ appliedAtRound: v.number() }),
  handler: async (ctx, args) => {
    const { room, participant } = await requireParticipant(ctx, args);

    const text = args.text.trim();
    if (text.length === 0) {
      throw new Error("Say something for your agent to act on");
    }
    if (text.length > 500) {
      throw new Error("Keep instructions under 500 characters");
    }
    if (room.status === "agreed" || room.status === "no_deal") {
      throw new Error("This negotiation has closed");
    }

    await ctx.db.insert("interventions", {
      roomId: args.roomId,
      participantId: participant._id,
      text,
      appliedAtRound: room.currentRound,
    });
    return { appliedAtRound: room.currentRound };
  },
});

/**
 * Confirm the settled terms on the caller's own behalf.
 *
 * The agents converge; the people decide. Nothing is binding until both flags
 * are set, and a caller can only ever set their own.
 */
export const confirmAgreement = mutation({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
  },
  returns: v.object({
    confirmedBySideA: v.boolean(),
    confirmedBySideB: v.boolean(),
    binding: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { participant } = await requireParticipant(ctx, args);

    const agreement = await ctx.db
      .query("agreements")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (agreement === null) {
      throw new Error("There is nothing to confirm yet");
    }

    const patch =
      participant.side === "a"
        ? { confirmedBySideA: true }
        : { confirmedBySideB: true };
    await ctx.db.patch("agreements", agreement._id, patch);

    const confirmedBySideA =
      participant.side === "a" ? true : agreement.confirmedBySideA;
    const confirmedBySideB =
      participant.side === "b" ? true : agreement.confirmedBySideB;
    const binding = confirmedBySideA && confirmedBySideB;

    if (binding && agreement.settledAt === undefined) {
      await ctx.db.patch("agreements", agreement._id, {
        settledAt: Date.now(),
      });
    }

    return { confirmedBySideA, confirmedBySideB, binding };
  },
});
