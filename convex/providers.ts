import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Which sign-in methods this deployment can actually complete.
 *
 * The Google button is only worth showing when Google credentials exist on the
 * deployment. Offering a button that errors is worse than not offering it, and
 * a visitor cannot tell the difference between "misconfigured" and "broken".
 *
 * Reporting presence, never values: a boolean saying an OAuth client is
 * configured discloses nothing, and it means the button turns itself on the
 * moment the credentials are set — no code change, no redeploy.
 */
export const available = query({
  args: {},
  returns: v.object({
    google: v.boolean(),
    password: v.boolean(),
  }),
  handler: async () => {
    const id = process.env.AUTH_GOOGLE_ID;
    const secret = process.env.AUTH_GOOGLE_SECRET;
    return {
      google:
        id !== undefined && id.length > 0 && secret !== undefined && secret.length > 0,
      // Always configured; it needs no external credentials, which is why it
      // stays as the path that always works.
      password: true,
    };
  },
});
