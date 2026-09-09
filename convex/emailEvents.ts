import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Record an inbound webhook delivery, keyed on AgentMail's `event_id`.
 *
 * Webhook delivery is at-least-once, so this is the idempotency gate: the
 * caller only does real work when `isDuplicate` comes back false.
 */
export const recordInbound = internalMutation({
  args: {
    eventId: v.string(),
    messageId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  returns: v.object({ isDuplicate: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (existing !== null) {
      return { isDuplicate: true };
    }

    await ctx.db.insert("emailEvents", {
      eventId: args.eventId,
      messageId: args.messageId,
      threadId: args.threadId,
      direction: "in",
      processedAt: Date.now(),
    });
    return { isDuplicate: false };
  },
});

/** Spike-only: read back what the webhook recorded, newest first. */
export const recentInbound = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      eventId: v.string(),
      messageId: v.optional(v.string()),
      threadId: v.optional(v.string()),
      processedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("emailEvents")
      .order("desc")
      .take(Math.min(args.limit, 50));
    return rows.map((r) => ({
      eventId: r.eventId,
      messageId: r.messageId,
      threadId: r.threadId,
      processedAt: r.processedAt,
    }));
  },
});
