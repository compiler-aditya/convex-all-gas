import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Caller resolution.
 *
 * The single rule this file exists to enforce: a participant is derived from
 * the request's own credentials, never from an id the client supplies. A
 * `participantId` argument would let anyone read the other side's private
 * bounds simply by passing a different id.
 *
 * Two credentials are accepted:
 *  - an authenticated user who owns a participant row in the room, or
 *  - the bearer of the room's join link, matched against a stored hash.
 */

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input) as unknown as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type ResolvedCaller = {
  room: Doc<"rooms">;
  participant: Doc<"participants">;
};

/**
 * Resolve the caller to exactly one participant of `roomId`, or throw.
 *
 * `joinToken` is the raw token from the invite link; it is hashed here and
 * compared against the stored hash, so the raw value is never persisted.
 */
export async function requireParticipant(
  ctx: QueryCtx,
  args: { roomId: Id<"rooms">; joinToken?: string },
): Promise<ResolvedCaller> {
  const room = await ctx.db.get("rooms", args.roomId);
  if (room === null) {
    throw new Error("Room not found");
  }

  // Path 1: a signed-in user who is a participant of this room.
  const userId = await getAuthUserId(ctx);
  if (userId !== null) {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(2);
    const mine = participants.find((p) => p.userId === userId);
    if (mine !== undefined) {
      return { room, participant: mine };
    }
  }

  // Path 2: bearer of the join link.
  if (args.joinToken !== undefined && args.joinToken.length > 0) {
    const hash = await sha256Hex(args.joinToken);
    const byToken = await ctx.db
      .query("participants")
      .withIndex("by_token", (q) => q.eq("joinTokenHash", hash))
      .unique();
    if (byToken !== null && byToken.roomId === args.roomId) {
      return { room, participant: byToken };
    }
  }

  throw new Error("Not a participant of this room");
}

/** The other side's participant row, when it exists. */
export async function getCounterparty(
  ctx: QueryCtx,
  roomId: Id<"rooms">,
  side: "a" | "b",
): Promise<Doc<"participants"> | null> {
  const other = side === "a" ? "b" : "a";
  return await ctx.db
    .query("participants")
    .withIndex("by_room_side", (q) => q.eq("roomId", roomId).eq("side", other))
    .unique();
}
