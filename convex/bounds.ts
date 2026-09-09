import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireParticipant } from "./lib/access";
import { getDimension, requireTemplate } from "./templates";

/**
 * Private bounds.
 *
 * This is the file the whole product's trust rests on. A participant's floor,
 * ceiling and priorities are readable by that participant alone. There is no
 * query here — or anywhere — that returns the other side's rows, not filtered
 * client-side and not included-then-hidden.
 *
 * The agents read bounds server-side when generating a proposal; the humans
 * never see each other's.
 */

const boundInput = v.object({
  dimensionKey: v.string(),
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  preferred: v.optional(v.number()),
  enumAllowed: v.optional(v.array(v.string())),
  weight: v.number(),
  isHard: v.boolean(),
});

export const setMyBounds = mutation({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
    bounds: v.array(boundInput),
  },
  returns: v.object({ written: v.number() }),
  handler: async (ctx, args) => {
    const { room, participant } = await requireParticipant(ctx, args);
    const template = requireTemplate(room.templateId);

    for (const bound of args.bounds) {
      const dimension = getDimension(template, bound.dimensionKey);
      if (dimension === undefined) {
        throw new Error(`Unknown dimension: ${bound.dimensionKey}`);
      }
      if (
        bound.min !== undefined &&
        bound.max !== undefined &&
        bound.min > bound.max
      ) {
        throw new Error(
          `${dimension.label}: minimum is above maximum, which can never be satisfied`,
        );
      }
      if (bound.weight < 0 || bound.weight > 1) {
        throw new Error(`${dimension.label}: weight must be between 0 and 1`);
      }
    }

    // Replace this participant's bounds wholesale so a resubmission cannot
    // leave a stale row behind that the engine would still honour.
    const existing = await ctx.db
      .query("bounds")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .take(100);
    for (const row of existing) {
      await ctx.db.delete("bounds", row._id);
    }

    for (const bound of args.bounds) {
      await ctx.db.insert("bounds", {
        roomId: args.roomId,
        participantId: participant._id,
        dimensionKey: bound.dimensionKey,
        min: bound.min,
        max: bound.max,
        preferred: bound.preferred,
        enumAllowed: bound.enumAllowed,
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

/** The caller's own bounds. Scoped by resolved participant, never by argument. */
export const myBounds = query({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      dimensionKey: v.string(),
      min: v.optional(v.number()),
      max: v.optional(v.number()),
      preferred: v.optional(v.number()),
      enumAllowed: v.optional(v.array(v.string())),
      weight: v.number(),
      isHard: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const { participant } = await requireParticipant(ctx, args);
    const rows = await ctx.db
      .query("bounds")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .take(100);
    return rows.map((r) => ({
      dimensionKey: r.dimensionKey,
      min: r.min,
      max: r.max,
      preferred: r.preferred,
      enumAllowed: r.enumAllowed,
      weight: r.weight,
      isHard: r.isHard,
    }));
  },
});
