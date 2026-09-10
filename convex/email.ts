import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { maskInbox } from "./lib/mask";
import { requireTemplate, type Template } from "./templates";

/**
 * The email layer.
 *
 * Rounds already exist and are already valid before anything is sent — email is
 * the delivery channel, not the negotiation. That ordering is deliberate: if
 * this layer fails, the negotiation still runs and the board still moves.
 *
 * Transport is switchable. EMAIL_TRANSPORT=mock records what would have been
 * sent without calling the provider, which keeps tests off a 100-messages-per-day
 * free tier. Live is the default so a demo cannot silently run on the mock.
 */

const API_BASE = "https://api.agentmail.to/v0";

function transportMode(): "live" | "mock" {
  return process.env.EMAIL_TRANSPORT === "mock" ? "mock" : "live";
}

/** Assign each side a pool inbox. Idempotent. */
export const assignInboxes = internalMutation({
  args: { roomId: v.id("rooms") },
  returns: v.object({ a: v.string(), b: v.string() }),
  handler: async (ctx, args) => {
    const pool = await ctx.db
      .query("inboxPool")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(10);
    if (pool.length < 2) {
      throw new Error(
        `Need 2 active pool inboxes, found ${pool.length}. Provision more first.`,
      );
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(2);

    const assigned: Record<string, string> = {};
    for (const participant of participants) {
      const inbox = participant.side === "a" ? pool[0] : pool[1];
      if (participant.agentInboxId !== inbox.inboxId) {
        await ctx.db.patch("participants", participant._id, {
          agentInboxId: inbox.inboxId,
        });
      }
      assigned[participant.side] = inbox.inboxId;
    }

    if (assigned.a === undefined || assigned.b === undefined) {
      throw new Error("Room is missing a participant on one side");
    }
    return { a: assigned.a, b: assigned.b };
  },
});

export const roundForEmail = internalQuery({
  args: { roomId: v.id("rooms"), roundIndex: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      templateId: v.string(),
      roomTitle: v.string(),
      bySide: v.union(v.literal("a"), v.literal("b")),
      proposal: v.any(),
      rationale: v.string(),
      fromInbox: v.optional(v.string()),
      toInbox: v.optional(v.string()),
      citations: v.array(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (room === null) return null;

    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_index", (q) =>
        q.eq("roomId", args.roomId).eq("index", args.roundIndex),
      )
      .unique();
    if (round === null) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(2);
    const sender = participants.find((p) => p.side === round.bySide);
    const recipient = participants.find((p) => p.side !== round.bySide);

    const citations: string[] = [];
    for (const id of round.citedGroundingIds) {
      const row = await ctx.db.get("grounding", id);
      if (row !== null) citations.push(row.sourceUrl);
    }

    return {
      templateId: room.templateId,
      roomTitle: room.title,
      bySide: round.bySide,
      proposal: round.proposal,
      rationale: round.rationale,
      fromInbox: sender?.agentInboxId,
      toInbox: recipient?.agentInboxId,
      citations,
    };
  },
});

export const recordMessageRoute = internalMutation({
  args: {
    messageId: v.string(),
    roomId: v.id("rooms"),
    sentBySide: v.union(v.literal("a"), v.literal("b")),
    roundIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("messageRoutes", {
      messageId: args.messageId,
      roomId: args.roomId,
      sentBySide: args.sentBySide,
      roundIndex: args.roundIndex,
    });
    await ctx.db.insert("emailEvents", {
      eventId: `out:${args.messageId}`,
      roomId: args.roomId,
      messageId: args.messageId,
      direction: "out",
      processedAt: Date.now(),
    });
    return null;
  },
});

/** Learn the recipient's thread id the first time we see it. */
export const rememberThread = internalMutation({
  args: {
    threadId: v.string(),
    roomId: v.id("rooms"),
    side: v.union(v.literal("a"), v.literal("b")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("threadRoutes")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .unique();
    if (existing !== null) return null;
    await ctx.db.insert("threadRoutes", {
      threadId: args.threadId,
      roomId: args.roomId,
      side: args.side,
    });
    return null;
  },
});

/** Resolve an inbound webhook to a room, by message id first, then thread. */
export const routeInbound = internalQuery({
  args: {
    messageId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      roomId: v.id("rooms"),
      /** The side that receives this message. */
      recipientSide: v.union(v.literal("a"), v.literal("b")),
      matchedBy: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.messageId !== undefined) {
      const route = await ctx.db
        .query("messageRoutes")
        .withIndex("by_message", (q) => q.eq("messageId", args.messageId!))
        .unique();
      if (route !== null) {
        return {
          roomId: route.roomId,
          recipientSide: route.sentBySide === "a" ? ("b" as const) : ("a" as const),
          matchedBy: "message-id",
        };
      }
    }

    if (args.threadId !== undefined) {
      const route = await ctx.db
        .query("threadRoutes")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId!))
        .unique();
      if (route !== null) {
        return {
          roomId: route.roomId,
          recipientSide: route.side,
          matchedBy: "thread-id",
        };
      }
    }

    return null;
  },
});

function renderBody(args: {
  template: Template;
  proposal: Record<string, number>;
  rationale: string;
  citations: string[];
}): string {
  const terms = args.template.dimensions
    .map((d) => {
      const value = args.proposal[d.key];
      if (typeof value !== "number") return null;
      const unit = d.unit === undefined ? "" : d.unit === "₹" ? "" : ` ${d.unit}`;
      const prefix = d.unit === "₹" ? "₹" : "";
      return `  ${d.label}: ${prefix}${value.toLocaleString("en-IN")}${unit}`;
    })
    .filter((line): line is string => line !== null)
    .join("\n");

  const sources =
    args.citations.length > 0
      ? `\n\nBased on:\n${args.citations.map((c) => `  ${c}`).join("\n")}`
      : "";

  return [
    args.rationale,
    "",
    "Proposed terms:",
    terms,
    sources,
    "",
    "— sent by an agent on behalf of its principal, who can override any term.",
  ].join("\n");
}

/**
 * Send one round as a real email between the two agent inboxes.
 *
 * Records the Message-Id before returning, so an inbound webhook that arrives
 * quickly can still be routed.
 */
export const sendRoundEmail = internalAction({
  args: { roomId: v.id("rooms"), roundIndex: v.number() },
  returns: v.object({
    sent: v.boolean(),
    transport: v.string(),
    messageId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const round = await ctx.runQuery(internal.email.roundForEmail, {
      roomId: args.roomId,
      roundIndex: args.roundIndex,
    });
    if (round === null) throw new Error("Round not found");
    if (round.fromInbox === undefined || round.toInbox === undefined) {
      throw new Error("Inboxes are not assigned for this room");
    }

    const template = requireTemplate(round.templateId);
    const subject = `${round.roomTitle} — round ${args.roundIndex + 1}`;
    const body = renderBody({
      template,
      proposal: round.proposal as Record<string, number>,
      rationale: round.rationale,
      citations: round.citations,
    });

    if (transportMode() === "mock") {
      const messageId = `mock-${args.roomId}-${args.roundIndex}`;
      await ctx.runMutation(internal.email.recordMessageRoute, {
        messageId,
        roomId: args.roomId,
        sentBySide: round.bySide,
        roundIndex: args.roundIndex,
      });
      await ctx.runMutation(internal.email.attachRoundMessageId, {
        roomId: args.roomId,
        roundIndex: args.roundIndex,
        messageId,
      });
      console.log(
        `[email:mock] ${maskInbox(round.fromInbox)} -> ${maskInbox(round.toInbox)} "${subject}"`,
      );
      return { sent: true, transport: "mock", messageId };
    }

    const apiKey = process.env.AGENTMAIL_API_KEY;
    if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not set");

    const response = await fetch(
      `${API_BASE}/inboxes/${encodeURIComponent(round.fromInbox)}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // A retried send must not produce a second email. AgentMail restricts
          // this header to A-Z a-z 0-9 - . _ ~ — a colon is rejected outright.
          "Idempotency-Key": `${args.roomId}-${args.roundIndex}`,
        },
        body: JSON.stringify({
          to: [round.toInbox],
          subject,
          text: body,
        }),
      },
    );

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`AgentMail send failed: ${response.status} ${text.slice(0, 300)}`);
    }
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const messageId =
      typeof parsed.message_id === "string" ? parsed.message_id : undefined;
    if (messageId === undefined) throw new Error("AgentMail returned no message_id");

    await ctx.runMutation(internal.email.recordMessageRoute, {
      messageId,
      roomId: args.roomId,
      sentBySide: round.bySide,
      roundIndex: args.roundIndex,
    });
    // Stamp the round so the UI can link an offer to the actual message.
    await ctx.runMutation(internal.email.attachRoundMessageId, {
      roomId: args.roomId,
      roundIndex: args.roundIndex,
      messageId,
      threadId:
        typeof parsed.thread_id === "string" ? parsed.thread_id : undefined,
    });

    console.log(
      `[email] ${maskInbox(round.fromInbox)} -> ${maskInbox(round.toInbox)} round ${args.roundIndex}`,
    );
    return { sent: true, transport: "live", messageId };
  },
});

export const attachRoundMessageId = internalMutation({
  args: {
    roomId: v.id("rooms"),
    roundIndex: v.number(),
    messageId: v.string(),
    threadId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db
      .query("rounds")
      .withIndex("by_room_index", (q) =>
        q.eq("roomId", args.roomId).eq("index", args.roundIndex),
      )
      .unique();
    if (round === null) return null;
    await ctx.db.patch("rounds", round._id as Id<"rounds">, {
      emailMessageId: args.messageId,
      emailThreadId: args.threadId,
    });
    return null;
  },
});
