import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * The signed-in person, as seen by themselves.
 *
 * Resolves the caller from the session rather than taking a user id, so this
 * can only ever return the caller's own record — the same rule the room
 * queries follow. Returns null when signed out, which is not an error: most
 * of this product is reachable without an account.
 */
export const viewer = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      email: v.optional(v.string()),
      name: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (user === null) return null;
    return { email: user.email, name: user.name };
  },
});
