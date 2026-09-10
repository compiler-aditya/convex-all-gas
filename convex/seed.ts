import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { sha256Hex } from "./lib/access";
import { requireTemplate } from "./templates";

/**
 * Development seeding.
 *
 * Creates a room without going through auth so the backend can be exercised
 * from the CLI. Internal only — this bypasses the sign-in path deliberately and
 * must never be reachable from the public API.
 */
export const createTestRoom = internalMutation({
  args: {
    templateId: v.string(),
    title: v.string(),
    contextUrl: v.optional(v.string()),
    joinToken: v.string(),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    creatorUserId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    requireTemplate(args.templateId);

    const creatorUserId = await ctx.db.insert("users", {
      name: "Seed freelancer",
    });

    const roomId = await ctx.db.insert("rooms", {
      templateId: args.templateId,
      title: args.title,
      createdBy: creatorUserId,
      contextUrl: args.contextUrl,
      status: "awaiting_counterparty",
      currentRound: 0,
      maxRounds: 8,
    });

    await ctx.db.insert("participants", {
      roomId,
      side: "a",
      userId: creatorUserId,
      displayName: "Maya",
      joinedAt: Date.now(),
    });

    await ctx.db.insert("participants", {
      roomId,
      side: "b",
      displayName: "Devin",
      joinTokenHash: await sha256Hex(args.joinToken),
    });

    return { roomId, creatorUserId };
  },
});

/** Set one side's bounds directly, bypassing auth. Development only. */
export const seedBounds = internalMutation({
  args: {
    roomId: v.id("rooms"),
    side: v.union(v.literal("a"), v.literal("b")),
    bounds: v.array(
      v.object({
        dimensionKey: v.string(),
        min: v.optional(v.number()),
        max: v.optional(v.number()),
        weight: v.number(),
        isHard: v.boolean(),
      }),
    ),
  },
  returns: v.object({ written: v.number() }),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room_side", (q) =>
        q.eq("roomId", args.roomId).eq("side", args.side),
      )
      .unique();
    if (participant === null) throw new Error(`No participant on side ${args.side}`);

    const existing = await ctx.db
      .query("bounds")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .take(100);
    for (const row of existing) await ctx.db.delete("bounds", row._id);

    for (const bound of args.bounds) {
      await ctx.db.insert("bounds", {
        roomId: args.roomId,
        participantId: participant._id,
        dimensionKey: bound.dimensionKey,
        min: bound.min,
        max: bound.max,
        weight: bound.weight,
        isHard: bound.isHard,
      });
    }
    await ctx.db.patch("participants", participant._id, {
      boundsSubmittedAt: Date.now(),
    });
    return { written: args.bounds.length };
  },
});

/** Wipe rounds and outcome so a scenario can be replayed. */
export const resetNegotiation = internalMutation({
  args: { roomId: v.id("rooms") },
  returns: v.object({ removed: v.number() }),
  handler: async (ctx, args) => {
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(100);
    for (const r of rounds) await ctx.db.delete("rounds", r._id);

    const agreements = await ctx.db
      .query("agreements")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(10);
    for (const a of agreements) await ctx.db.delete("agreements", a._id);

    await ctx.db.patch("rooms", args.roomId, {
      status: "negotiating",
      currentRound: 0,
      closedAt: undefined,
      noDealDimension: undefined,
    });
    return { removed: rounds.length };
  },
});
