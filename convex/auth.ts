import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Authentication for room creators.
 *
 * Only the person who opens a negotiation signs in. The counterparty joins
 * through a signed link and never creates an account, which is what removes the
 * usual two-sided adoption problem — see `convex/rooms.ts`.
 *
 * Password rather than email OTP: OTP needs an external email provider wired in
 * for something a single role uses, and adds a key and a failure mode we would
 * carry for the whole build. Password needs no extra infrastructure and makes
 * demoing two identities in two browser windows trivial.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
