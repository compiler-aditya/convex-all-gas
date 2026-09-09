import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireParticipant } from "./lib/access";
import { scrapeContext, searchComparables } from "./lib/firecrawl";
import { requireTemplate, type Template } from "./templates";

/**
 * Grounding.
 *
 * Two jobs, both real: read the context the negotiation is actually about, and
 * establish what the market says. Every later proposal cites rows from this
 * table, so an agent cannot assert a number the other side has no way to check.
 *
 * BOUNDARY: grounding is advisory. It is shown to both humans and given to the
 * model as evidence, but it never sets a numeric bound. Bounds come only from
 * what each person entered for themselves.
 *
 * This is deliberate. Extracted values carry no unit or currency, so a page
 * quoting "$15/hr" yields `rate: 15` against a dimension that means "total fee
 * in rupees". Treating that as an anchor would silently corrupt a negotiation
 * in the one place users cannot check. A scraped page may inform a person's
 * decision; it may not make it for them.
 */

/** Ask for exactly the dimensions this template negotiates over. */
function extractionPrompt(template: Template): string {
  const fields = template.dimensions
    .map((d) => `- ${d.key} (${d.label}${d.unit ? `, in ${d.unit}` : ""})`)
    .join("\n");
  return [
    `This page is the context for a "${template.name}" negotiation.`,
    "Extract a short factual summary field called `summary`, and any of the",
    "following that the page actually states:",
    fields,
    "",
    "Use null for anything the page does not state. Do not estimate, infer, or",
    "fill in a typical value — these become citable claims in a negotiation.",
  ].join("\n");
}

/** Longest comparable excerpt kept. Enough to carry a rate, not a whole page. */
const MAX_COMP_CHARS = 600;

/** Compare URLs ignoring scheme, www, trailing slash and query. */
function normaliseUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function comparablesQuery(template: Template, contextTitle?: string): string {
  const subject = contextTitle ?? template.name;
  return `typical market rate and timeline for ${subject} freelance project pricing`;
}

export const storeGrounding = internalMutation({
  args: {
    roomId: v.id("rooms"),
    kind: v.union(v.literal("context"), v.literal("comps")),
    sourceUrl: v.string(),
    title: v.optional(v.string()),
    extracted: v.any(),
    snippet: v.optional(v.string()),
  },
  returns: v.id("grounding"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("grounding", {
      roomId: args.roomId,
      kind: args.kind,
      sourceUrl: args.sourceUrl,
      title: args.title,
      extracted: args.extracted,
      snippet: args.snippet,
      fetchedAt: Date.now(),
    });
  },
});

export const clearGrounding = internalMutation({
  args: { roomId: v.id("rooms") },
  returns: v.object({ removed: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("grounding")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(100);
    for (const row of rows) {
      await ctx.db.delete("grounding", row._id);
    }
    return { removed: rows.length };
  },
});

export const roomForGrounding = internalQuery({
  args: { roomId: v.id("rooms") },
  returns: v.union(
    v.null(),
    v.object({
      templateId: v.string(),
      title: v.string(),
      contextUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (room === null) return null;
    return {
      templateId: room.templateId,
      title: room.title,
      contextUrl: room.contextUrl,
    };
  },
});

export const setRoomStatus = internalMutation({
  args: {
    roomId: v.id("rooms"),
    status: v.union(
      v.literal("grounding"),
      v.literal("negotiating"),
      v.literal("awaiting_counterparty"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("rooms", args.roomId, { status: args.status });
    return null;
  },
});

/**
 * Ground a room: scrape its context page, then find market comparables.
 *
 * Re-running replaces previous rows rather than appending, so re-grounding
 * after a context change cannot leave stale citations behind that a proposal
 * would still point at.
 */
export const groundRoom = internalAction({
  args: { roomId: v.id("rooms") },
  returns: v.object({
    contextStored: v.boolean(),
    comparablesStored: v.number(),
  }),
  handler: async (ctx, args) => {
    const room = await ctx.runQuery(internal.grounding.roomForGrounding, {
      roomId: args.roomId,
    });
    if (room === null) throw new Error("Room not found");
    const template = requireTemplate(room.templateId);

    await ctx.runMutation(internal.grounding.setRoomStatus, {
      roomId: args.roomId,
      status: "grounding",
    });
    await ctx.runMutation(internal.grounding.clearGrounding, {
      roomId: args.roomId,
    });

    let contextStored = false;
    let contextTitle: string | undefined;

    if (room.contextUrl !== undefined && room.contextUrl.length > 0) {
      const context = await scrapeContext({
        url: room.contextUrl,
        prompt: extractionPrompt(template),
        numericKeys: template.dimensions.map((d) => d.key),
      });
      contextTitle = context.title;
      await ctx.runMutation(internal.grounding.storeGrounding, {
        roomId: args.roomId,
        kind: "context",
        sourceUrl: context.sourceUrl,
        title: context.title,
        extracted: context.extracted,
        snippet: context.snippet,
      });
      contextStored = true;
    }

    const comparables = await searchComparables({
      query: comparablesQuery(template, contextTitle ?? room.title),
      limit: 5,
    });

    // Search reliably returns the context page itself plus near-duplicates.
    // A comparable that is the thing being negotiated is not a comparable.
    const seen = new Set<string>();
    if (room.contextUrl !== undefined) seen.add(normaliseUrl(room.contextUrl));

    let comparablesStored = 0;
    for (const comparable of comparables) {
      if (comparable.url.length === 0) continue;
      const key = normaliseUrl(comparable.url);
      if (seen.has(key)) continue;
      seen.add(key);

      // Results carry whole-page markdown — nav menus, country lists, footers.
      // Store a bounded excerpt so the model's prompt is evidence, not chrome.
      const description = comparable.description.slice(0, MAX_COMP_CHARS);
      await ctx.runMutation(internal.grounding.storeGrounding, {
        roomId: args.roomId,
        kind: "comps",
        sourceUrl: comparable.url,
        title: comparable.title,
        extracted: { description },
        snippet: description.slice(0, 300),
      });
      comparablesStored += 1;
    }

    return { contextStored, comparablesStored };
  },
});

/**
 * Grounding for a room, readable by either participant.
 *
 * Unlike bounds, this is deliberately shared: both sides negotiate against the
 * same evidence, and both can click through to the source.
 */
export const roomGrounding = query({
  args: {
    roomId: v.id("rooms"),
    joinToken: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      groundingId: v.id("grounding"),
      kind: v.string(),
      sourceUrl: v.string(),
      title: v.optional(v.string()),
      snippet: v.optional(v.string()),
      extracted: v.any(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireParticipant(ctx, args);
    const rows = await ctx.db
      .query("grounding")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(50);
    return rows.map((r) => ({
      groundingId: r._id as Id<"grounding">,
      kind: r.kind,
      sourceUrl: r.sourceUrl,
      title: r.title,
      snippet: r.snippet,
      extracted: r.extracted,
    }));
  },
});
