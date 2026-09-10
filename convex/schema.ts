import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Overlap — schema v1.
 *
 * The engine is domain-agnostic: a negotiation is a set of typed *dimensions*
 * (rate, deadline, revisions, ...) defined by a template in code. Each side
 * stores PRIVATE bounds per dimension. The whole product rests on one
 * invariant: a participant can read only their own `bounds` rows.
 */

export const side = v.union(v.literal("a"), v.literal("b"));

export const roomStatus = v.union(
  v.literal("draft"),
  v.literal("awaiting_counterparty"),
  v.literal("grounding"),
  v.literal("negotiating"),
  v.literal("agreed"),
  v.literal("no_deal"),
  v.literal("expired"),
);

export default defineSchema({
  ...authTables,

  rooms: defineTable({
    templateId: v.string(),
    title: v.string(),
    createdBy: v.id("users"),
    contextUrl: v.optional(v.string()),
    status: roomStatus,
    currentRound: v.number(),
    maxRounds: v.number(),
    closedAt: v.optional(v.number()),
    // Set when the negotiation ends without a zone; names the blocking
    // dimension only — never the numbers behind it.
    noDealDimension: v.optional(v.string()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"]),

  participants: defineTable({
    roomId: v.id("rooms"),
    side,
    // null for the counterparty, who joins by token without an account
    userId: v.optional(v.id("users")),
    displayName: v.string(),
    contactEmail: v.optional(v.string()),
    // Join tokens are stored hashed; the raw token exists only in the link.
    joinTokenHash: v.optional(v.string()),
    agentInboxId: v.optional(v.string()),
    joinedAt: v.optional(v.number()),
    boundsSubmittedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_side", ["roomId", "side"])
    .index("by_token", ["joinTokenHash"]),

  /**
   * PRIVATE. Never readable by the opposing participant through any query.
   * See the authorization invariants in the plan.
   */
  bounds: defineTable({
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    dimensionKey: v.string(),
    min: v.optional(v.number()),
    max: v.optional(v.number()),
    preferred: v.optional(v.number()),
    enumAllowed: v.optional(v.array(v.string())),
    // 0..1 priority weight, used by the utility function
    weight: v.number(),
    isHard: v.boolean(),
  })
    .index("by_participant", ["participantId"])
    .index("by_room_dimension", ["roomId", "dimensionKey"]),

  grounding: defineTable({
    roomId: v.id("rooms"),
    kind: v.union(v.literal("context"), v.literal("comps")),
    sourceUrl: v.string(),
    title: v.optional(v.string()),
    extracted: v.any(),
    snippet: v.optional(v.string()),
    fetchedAt: v.number(),
  }).index("by_room", ["roomId"]),

  rounds: defineTable({
    roomId: v.id("rooms"),
    index: v.number(),
    bySide: side,
    // { [dimensionKey]: value }
    proposal: v.any(),
    rationale: v.string(),
    citedGroundingIds: v.array(v.id("grounding")),
    utilityForProposer: v.number(),
    emailMessageId: v.optional(v.string()),
    emailThreadId: v.optional(v.string()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_index", ["roomId", "index"]),

  interventions: defineTable({
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    text: v.string(),
    appliedAtRound: v.number(),
  }).index("by_room", ["roomId"]),

  agreements: defineTable({
    roomId: v.id("rooms"),
    terms: v.any(),
    citedGroundingIds: v.array(v.id("grounding")),
    confirmedBySideA: v.boolean(),
    confirmedBySideB: v.boolean(),
    settledAt: v.optional(v.number()),
  }).index("by_room", ["roomId"]),

  // --- Email plumbing (AgentMail) ---

  /** Shared pool of agent inboxes; rooms borrow rather than own. */
  inboxPool: defineTable({
    inboxId: v.string(),
    label: v.string(),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"])
    .index("by_inbox", ["inboxId"]),

  /** AgentMail thread_id -> which room and side the thread belongs to. */
  threadRoutes: defineTable({
    threadId: v.string(),
    roomId: v.id("rooms"),
    side,
  })
    .index("by_thread", ["threadId"])
    .index("by_room", ["roomId"]),

  /**
   * Message-Id -> room, recorded on send.
   *
   * Thread ids are per-inbox: the sender's thread is not the thread the webhook
   * delivers, so thread-only routing fails on the opening message of every
   * negotiation — the recipient's thread id has never been seen before. The
   * Message-Id header does survive delivery unchanged, so the first inbound
   * event is matched here, and the recipient's thread id is learned and stored
   * from that point on.
   */
  messageRoutes: defineTable({
    messageId: v.string(),
    roomId: v.id("rooms"),
    /** The side that sent it; the webhook therefore belongs to the other. */
    sentBySide: side,
    roundIndex: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_room", ["roomId"]),

  /** Webhook idempotency + audit trail. Deliveries are at-least-once. */
  emailEvents: defineTable({
    eventId: v.string(),
    roomId: v.optional(v.id("rooms")),
    messageId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    direction: v.union(v.literal("in"), v.literal("out")),
    processedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_room", ["roomId"]),
});
