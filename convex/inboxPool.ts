import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { maskInbox } from "./lib/mask";

/**
 * The shared pool of agent inboxes.
 *
 * Rooms borrow inboxes rather than owning them: a negotiation is identified by
 * AgentMail's `thread_id`, not by a dedicated address. That keeps us inside the
 * free tier's 3-inbox cap and scales later by adding rows, not by changing code.
 */

export const upsertPoolInbox = internalMutation({
  args: {
    inboxId: v.string(),
    label: v.string(),
  },
  returns: v.object({ created: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("inboxPool")
      .withIndex("by_inbox", (q) => q.eq("inboxId", args.inboxId))
      .unique();

    if (existing !== null) {
      await ctx.db.patch("inboxPool", existing._id, {
        label: args.label,
        isActive: true,
      });
      return { created: false };
    }

    await ctx.db.insert("inboxPool", {
      inboxId: args.inboxId,
      label: args.label,
      isActive: true,
    });
    return { created: true };
  },
});

/**
 * Make exactly these inboxes the active pool; deactivate anything else.
 *
 * Used to retire an adopted personal inbox once purpose-named agent addresses
 * exist — the `from` address is visible in the demo, so it should read as an
 * agent rather than a person.
 */
export const replacePool = internalMutation({
  args: {
    inboxes: v.array(v.object({ inboxId: v.string(), label: v.string() })),
  },
  returns: v.object({ active: v.number(), deactivated: v.number() }),
  handler: async (ctx, args) => {
    const keep = new Set(args.inboxes.map((i) => i.inboxId));

    const all = await ctx.db.query("inboxPool").take(50);
    let deactivated = 0;
    for (const row of all) {
      if (!keep.has(row.inboxId) && row.isActive) {
        await ctx.db.patch("inboxPool", row._id, { isActive: false });
        deactivated++;
      }
    }

    for (const inbox of args.inboxes) {
      const existing = await ctx.db
        .query("inboxPool")
        .withIndex("by_inbox", (q) => q.eq("inboxId", inbox.inboxId))
        .unique();
      if (existing !== null) {
        await ctx.db.patch("inboxPool", existing._id, {
          label: inbox.label,
          isActive: true,
        });
      } else {
        await ctx.db.insert("inboxPool", {
          inboxId: inbox.inboxId,
          label: inbox.label,
          isActive: true,
        });
      }
    }

    return { active: args.inboxes.length, deactivated };
  },
});

/** Inspection only — addresses come back masked. */
export const listActive = internalQuery({
  args: {},
  returns: v.array(v.object({ masked: v.string(), label: v.string() })),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("inboxPool")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(10);
    return rows.map((r) => ({ masked: maskInbox(r.inboxId), label: r.label }));
  },
});
