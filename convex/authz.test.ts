import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

/**
 * The invariant these tests exist to protect: a participant can read their own
 * bounds and nobody else's.
 *
 * If any of these fail, the product is broken in the way that matters most —
 * the entire premise is that neither side learns the other's limit. They are
 * written now, while the query surface is five functions, rather than later
 * when it is fifty.
 */

// Convex Auth encodes identity as `${userId}|${sessionId}` in the JWT subject.
const asUser = (t: ReturnType<typeof convexTest>, userId: string) =>
  t.withIdentity({ subject: `${userId}|test-session` });

const FREELANCER_BOUNDS = [
  { dimensionKey: "rate", min: 110000, weight: 1, isHard: true },
  { dimensionKey: "deliveryDays", min: 28, weight: 0.6, isHard: false },
];

const CLIENT_BOUNDS = [
  { dimensionKey: "rate", max: 145000, weight: 1, isHard: true },
  { dimensionKey: "scopeUnits", min: 3, weight: 0.8, isHard: true },
];

async function setupRoom() {
  const t = convexTest(schema);
  const creatorId = await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "Maya" }),
  );
  const creator = asUser(t, creatorId);

  const { roomId, joinToken } = await creator.mutation(api.rooms.createRoom, {
    templateId: "freelance",
    title: "Customer dashboard",
    creatorName: "Maya",
    counterpartyName: "Devin",
    creatorSide: "a",
  });

  return { t, creatorId, creator, roomId, joinToken };
}

describe("bounds are private to their owner", () => {
  test("each side reads only its own bounds", async () => {
    const { t, creator, roomId, joinToken } = await setupRoom();

    // Both sides must have submitted, or "everything in the room" and "mine"
    // are the same set and this test cannot detect a leak at all.
    await creator.mutation(api.bounds.setMyBounds, {
      roomId,
      bounds: FREELANCER_BOUNDS,
    });
    await t.mutation(api.rooms.joinRoom, { roomId, joinToken });
    await t.mutation(api.bounds.setMyBounds, {
      roomId,
      joinToken,
      bounds: CLIENT_BOUNDS,
    });

    const mine = await creator.query(api.bounds.myBounds, { roomId });
    expect(mine.map((b) => b.dimensionKey).sort()).toEqual([
      "deliveryDays",
      "rate",
    ]);
    // The freelancer's floor is visible to the freelancer.
    expect(mine.find((b) => b.dimensionKey === "rate")?.min).toBe(110000);
    // ...and nothing here belongs to the other side.
    expect(mine.some((b) => b.max === 145000)).toBe(false);
  });

  test("the token bearer sees their own bounds, never the creator's", async () => {
    const { t, creator, roomId, joinToken } = await setupRoom();

    await creator.mutation(api.bounds.setMyBounds, {
      roomId,
      bounds: FREELANCER_BOUNDS,
    });

    // Anonymous counterparty, authenticated only by the link.
    await t.mutation(api.rooms.joinRoom, { roomId, joinToken });
    await t.mutation(api.bounds.setMyBounds, {
      roomId,
      joinToken,
      bounds: CLIENT_BOUNDS,
    });

    const theirs = await t.query(api.bounds.myBounds, { roomId, joinToken });
    expect(theirs.map((b) => b.dimensionKey).sort()).toEqual([
      "rate",
      "scopeUnits",
    ]);
    expect(theirs.find((b) => b.dimensionKey === "rate")?.max).toBe(145000);
    // The freelancer's floor must not appear on the client's side.
    expect(theirs.some((b) => b.min === 110000)).toBe(false);

    // And the creator still sees only their own after the counterparty wrote.
    const mine = await creator.query(api.bounds.myBounds, { roomId });
    expect(mine.some((b) => b.max === 145000)).toBe(false);
    expect(mine).toHaveLength(2);
  });
});

describe("callers who should not get in", () => {
  test("a forged join token is rejected", async () => {
    const { t, roomId } = await setupRoom();
    await expect(
      t.query(api.bounds.myBounds, { roomId, joinToken: "f".repeat(64) }),
    ).rejects.toThrow(/not a participant/i);
  });

  test("no token and no session is rejected", async () => {
    const { t, roomId } = await setupRoom();
    await expect(t.query(api.bounds.myBounds, { roomId })).rejects.toThrow(
      /not a participant/i,
    );
  });

  test("an authenticated stranger is rejected", async () => {
    const { t, roomId } = await setupRoom();
    const strangerId = await t.run(async (ctx) =>
      ctx.db.insert("users", { name: "Stranger" }),
    );
    await expect(
      asUser(t, strangerId).query(api.bounds.myBounds, { roomId }),
    ).rejects.toThrow(/not a participant/i);
  });

  test("a stranger cannot write bounds into someone else's room", async () => {
    const { t, roomId } = await setupRoom();
    const strangerId = await t.run(async (ctx) =>
      ctx.db.insert("users", { name: "Stranger" }),
    );
    await expect(
      asUser(t, strangerId).mutation(api.bounds.setMyBounds, {
        roomId,
        bounds: CLIENT_BOUNDS,
      }),
    ).rejects.toThrow(/not a participant/i);
  });
});

describe("room state leaks readiness, not numbers", () => {
  test("getRoom reports that the other side submitted, not what they said", async () => {
    const { t, creator, roomId, joinToken } = await setupRoom();

    await t.mutation(api.rooms.joinRoom, { roomId, joinToken });
    await t.mutation(api.bounds.setMyBounds, {
      roomId,
      joinToken,
      bounds: CLIENT_BOUNDS,
    });

    const view = await creator.query(api.rooms.getRoom, { roomId });
    expect(view.counterpartyBoundsSubmitted).toBe(true);
    expect(view.counterpartyJoined).toBe(true);

    // No field on the room view may carry the other side's numbers.
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("145000");
    expect(serialized).not.toContain("scopeUnits");
  });
});

describe("bounds validation", () => {
  test("an impossible range is refused", async () => {
    const { creator, roomId } = await setupRoom();
    await expect(
      creator.mutation(api.bounds.setMyBounds, {
        roomId,
        bounds: [{ dimensionKey: "rate", min: 200000, max: 100000, weight: 1, isHard: true }],
      }),
    ).rejects.toThrow(/never be satisfied/i);
  });

  test("an unknown dimension is refused", async () => {
    const { creator, roomId } = await setupRoom();
    await expect(
      creator.mutation(api.bounds.setMyBounds, {
        roomId,
        bounds: [{ dimensionKey: "vibes", min: 1, weight: 1, isHard: false }],
      }),
    ).rejects.toThrow(/unknown dimension/i);
  });

  test("resubmitting replaces rather than accumulates", async () => {
    const { creator, roomId } = await setupRoom();
    await creator.mutation(api.bounds.setMyBounds, {
      roomId,
      bounds: FREELANCER_BOUNDS,
    });
    await creator.mutation(api.bounds.setMyBounds, {
      roomId,
      bounds: [{ dimensionKey: "rate", min: 120000, weight: 1, isHard: true }],
    });
    const mine = await creator.query(api.bounds.myBounds, { roomId });
    expect(mine).toHaveLength(1);
    expect(mine[0].min).toBe(120000);
  });
});
