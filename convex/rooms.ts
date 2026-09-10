import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireParticipant, sha256Hex } from "./lib/access";
import { requireTemplate } from "./templates";

/**
 * Rooms.
 *
 * A room is one negotiation between exactly two sides. The creator signs in;
 * the counterparty joins through a link and never makes an account. That
 * asymmetry is deliberate — needing both parties to register is what kills
 * two-sided products before they start.
 */

/** 32 bytes of entropy, hex encoded. The raw value is shown exactly once. */
function generateJoinToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const createRoom = mutation({
  args: {
    templateId: v.string(),
    title: v.string(),
    contextUrl: v.optional(v.string()),
    creatorName: v.string(),
    counterpartyName: v.string(),
    /** Which side the creator takes; the counterparty gets the other. */
    creatorSide: v.union(v.literal("a"), v.literal("b")),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    joinToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Sign in to create a room");
    }
    // Throws on an unknown template rather than creating an unusable room.
    requireTemplate(args.templateId);

    const roomId = await ctx.db.insert("rooms", {
      templateId: args.templateId,
      title: args.title,
      createdBy: userId,
      contextUrl: args.contextUrl,
      status: "awaiting_counterparty",
      currentRound: 0,
      maxRounds: 8,
    });

    const counterpartySide = args.creatorSide === "a" ? "b" : "a";
    const joinToken = generateJoinToken();

    await ctx.db.insert("participants", {
      roomId,
      side: args.creatorSide,
      userId,
      displayName: args.creatorName,
      joinedAt: Date.now(),
    });

    await ctx.db.insert("participants", {
      roomId,
      side: counterpartySide,
      displayName: args.counterpartyName,
      joinTokenHash: await sha256Hex(joinToken),
    });

    return { roomId, joinToken };
  },
});

/**
 * Everything the caller is allowed to see about a room.
 *
 * Returns the caller's own side and whether the other side has submitted, but
 * never the other side's bounds. There is deliberately no query anywhere that
 * returns them.
 */
export const getRoom = query({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
  },
  returns: v.object({
    title: v.string(),
    templateId: v.string(),
    status: v.string(),
    contextUrl: v.optional(v.string()),
    currentRound: v.number(),
    maxRounds: v.number(),
    mySide: v.union(v.literal("a"), v.literal("b")),
    myDisplayName: v.string(),
    myBoundsSubmitted: v.boolean(),
    counterpartyName: v.optional(v.string()),
    counterpartyJoined: v.boolean(),
    counterpartyBoundsSubmitted: v.boolean(),
    /** Set only on no_deal. The dimension label, never a number. */
    noDealDimension: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { room, participant } = await requireParticipant(ctx, args);

    const others = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(2);
    const other = others.find((p) => p._id !== participant._id);

    return {
      title: room.title,
      templateId: room.templateId,
      status: room.status,
      contextUrl: room.contextUrl,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      mySide: participant.side,
      myDisplayName: participant.displayName,
      myBoundsSubmitted: participant.boundsSubmittedAt !== undefined,
      counterpartyName: other?.displayName,
      counterpartyJoined: other?.joinedAt !== undefined,
      // Whether they are ready — not what they said.
      counterpartyBoundsSubmitted: other?.boundsSubmittedAt !== undefined,
      noDealDimension: room.noDealDimension,
    };
  },
});

/** Mark the token-bearing counterparty as having arrived. */
export const joinRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.string(),
    displayName: v.optional(v.string()),
  },
  returns: v.object({ side: v.union(v.literal("a"), v.literal("b")) }),
  handler: async (ctx, args) => {
    const { participant } = await requireParticipant(ctx, args);
    if (participant.joinedAt === undefined) {
      await ctx.db.patch("participants", participant._id, {
        joinedAt: Date.now(),
        ...(args.displayName !== undefined
          ? { displayName: args.displayName }
          : {}),
      });
    }
    return { side: participant.side };
  },
});

/** Rooms the signed-in user created, newest first. */
export const myRooms = query({
  args: {},
  returns: v.array(
    v.object({
      roomId: v.id("rooms"),
      title: v.string(),
      templateId: v.string(),
      status: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .order("desc")
      .take(50);
    return rooms.map((r) => ({
      roomId: r._id,
      title: r.title,
      templateId: r.templateId,
      status: r.status,
    }));
  },
});
