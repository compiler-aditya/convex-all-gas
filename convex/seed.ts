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
