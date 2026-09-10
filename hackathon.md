# Hackathon log

- **Project:** convex-all-gas
- **Event:** Convex All Gas Hackathon
- **What it does:** Not documented yet
- **Live app:** not deployed
- **Repo:** private
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, actions, HTTP actions, Convex Auth
- **Auth:** Convex Auth
- **AI models:** gemini-3.5-flash (development; provider is switchable by env var)
- **Started:** 2026-09-09T17:31:07Z
- **Last updated:** 2026-09-10T00:03:20Z

## Log

### 2026-09-09
Set up the development environment for the hackathon. No application code
exists yet, so no product behavior is claimed. The project root holds the
Convex hackathon build-log skill and this log. Chose Convex static hosting as
the frontend host; the `@convex-dev/static-hosting` component is not installed
yet. Convex features: none yet.

### 2026-09-09 - 5644417
Initialized the Git repository on `main` and wired the `origin` remote to a
private GitHub repo. Added a `.gitignore` that excludes `.env`, `.env.local`,
and build output so Convex deploy keys cannot be committed. No commits exist
yet and nothing has been pushed. Still no application code, so no Convex
features are claimed.

### 2026-09-09 - 85f5b06
Scaffolded the app. Frontend is Vite + React + TypeScript + Tailwind; backend is
Convex. Schema v1 defines rooms, participants, per-side private bounds, grounding,
rounds, interventions, agreements, and the email-routing tables
(`convex/schema.ts`). Registered the static-hosting component so the site owns `/`
and app HTTP routes are namespaced under `/api`, which fixes the future webhook
path before anything depends on it (`convex/convex.config.ts`). Verified the deploy
path end to end on the development deployment: the built SPA serves over HTTPS,
hashed assets return correct content types, unknown client-side routes fall back to
`index.html`, and a missing asset still returns 404. Production is not deployed and
no auth is wired yet. Convex features: schema, tables, indexes.

### 2026-09-09 - 6f6be66
Proved the inbound email path before building anything on top of it. A signed
AgentMail webhook now lands at `/api/webhooks/agentmail`, with Svix signature
verification written directly against Web Crypto so it runs on Convex's default
runtime instead of pulling in Node (`convex/lib/svix.ts`, `convex/http.ts`).
Verified by sending a real message between two agent inboxes: forged signatures,
missing headers, and stale timestamps are all rejected with 400, a genuine
delivery returns 204, and replaying the same `event_id` records no second row.
Added a shared inbox pool so rooms borrow addresses rather than owning them,
keeping the design inside the provider's free-tier inbox cap
(`convex/inboxPool.ts`, `convex/agentmail.ts`). Secrets live in deployment
environment variables (`AGENTMAIL_API_KEY`, `AGENTMAIL_WEBHOOK_SECRET`), never
in the repository.

The spike changed the routing design. Thread identifiers are per-inbox, so the
sender's thread id is not the one the webhook delivers, and routing purely by
thread would fail on the opening message of every negotiation. The sent
message id does survive delivery unchanged, so the first inbound event is
matched by message id and the recipient's thread id is learned and stored from
there. Convex features: schema, tables, indexes, queries, mutations, actions,
HTTP actions.

### 2026-09-09 - 88c385d
Rooms, private bounds and the authorization model. A room is one negotiation
between two sides over a set of typed dimensions defined by a template in code,
so the engine stays domain-agnostic rather than freelance-specific
(`convex/templates/`). The creator signs in with Convex Auth; the counterparty
joins through a link carrying a 32-byte token, stored only as a hash, and never
creates an account (`convex/rooms.ts`, `convex/lib/access.ts`).

Callers are resolved to a participant server-side from session or token — a
participant id is never accepted as an argument, since that alone would let
anyone read the other side's private bounds (`convex/bounds.ts`). Ten tests
cover the invariant, including a forged token, an authenticated stranger, and a
stranger attempting a write. The isolation tests were then verified by
deliberately breaking the scoping to confirm they fail when the invariant
fails; two caught it, and the weaker of the two was rewritten after the first
attempt caught nothing.

Auth's discovery documents forced a routing change. The static host originally
owned `/`, which meant `/.well-known/openid-configuration` was answered by the
SPA fallback with HTML and a 200, so token verification would have failed while
appearing healthy. The app now owns the root and registers the static catch-all
last, since exact routes win (`convex/http.ts`, `convex/convex.config.ts`).
Convex features: schema, tables, indexes, queries, mutations, actions, HTTP
actions, Convex Auth.

### 2026-09-09 - 3059376
Wired the auth client. The React app is wrapped in `ConvexAuthProvider` rather
than the plain provider, which is the difference between tokens being sent and
silently not being sent (`src/main.tsx`). Added a sign-in and registration form
that keeps its error messages vague so it cannot be used to discover which
addresses have accounts, and a dashboard gated on auth state
(`src/components/SignIn.tsx`, `src/App.tsx`).

Verified in a browser against the deployed development build rather than
assumed: registering established a session, the authenticated room query ran
and rendered its empty state, the session survived a full page reload, and the
console was free of errors. That exercises the whole chain — provider, token,
`auth.config.ts`, the JWKS document, and server-side user resolution.

### 2026-09-09 - a694800
Firecrawl grounding. Before any number is proposed, a room reads the page the
negotiation is actually about and searches for market comparables, storing each
with its source URL so proposals can cite them
(`convex/lib/firecrawl.ts`, `convex/grounding.ts`).

Running it against a real page exposed two faults worth recording. The
extraction answered "not stated" with zero rather than null, so a page that
mentions no timeline yielded a delivery window of zero days — a number the
engine would have treated as a real anchor meaning "deliver instantly". Values
that are missing or non-positive are now discarded rather than trusted. Search
also returned the context page itself as its own comparable, alongside several
kilobytes of navigation markup per result; results are now deduplicated by
normalised URL and excerpts are capped.

One limit is deliberate rather than fixed: extracted values carry no unit or
currency, so a page quoting an hourly rate produces a bare number against a
dimension meaning a total fee. Grounding is therefore advisory. It is shown to
both people and given to the model as evidence, but numeric bounds come only
from what each person entered for themselves. A scraped page may inform a
decision; it may not make it.

### 2026-09-09 - 2eb3191
The scoring half of the negotiation engine, with no model involved
(`convex/engine/scoring.ts`). Given two sets of private limits it finds the
agreement zone per dimension, scores any proposal for both sides on the same
normalised scale, names the dimension blocking a deal without revealing either
side's numbers, and ranks where a side can afford to concede — cheapest first,
never on a limit marked hard.

The validation guard is the trust boundary: a proposal that breaks the
proposer's own limits is rejected before it can become an email or an
agreement. Proposing something better for yourself stays allowed, since asking
high is negotiating and only going under your own floor is a fault. Eighteen
tests cover it, then the guard was deliberately disabled and hard limits made
tradeable to confirm the right two tests fail. They did.

Model access is written against either provider: OpenAI directly, or the Convex
AI Gateway, chosen at call time by which credential exists (`convex/lib/model.ts`).
The gateway needs a paid Convex plan, so the deployment is not held hostage to
one billing decision. No model call has run yet, so no model is claimed.

### 2026-09-10 - working tree
The negotiation engine runs end to end, with no email involved
(`convex/engine/propose.ts`, `convex/negotiation.ts`). Sides alternate. Each
round the server first decides, from the bounds alone, whether the standing
offer is already acceptable, and only asks the model for a counter when it is
not — acceptance is never left to the model, which is both safer and steadier
to demonstrate. Generated proposals are validated against the proposer's own
limits, repaired once with feedback if they break them, and clamped as a last
resort, so no offer that violates its own side's floor can ever be recorded.

A real run settled a deal at a fee inside the zone that neither side disclosed,
with every agreed term inside both sides' limits. The opposite case concludes in
one step without spending a model call: when the ranges cannot meet, the room
closes naming the blocking dimension and nothing else, verified to contain none
of either side's numbers.

Two faults surfaced only by running it. The leak guard matched limit values as
substrings, so a scope limit of 4 matched any sentence containing that digit and
suppressed two of three messages; it now ignores values a side actually
proposed, since stating your own offer is not a disclosure, and skips values too
small to distinguish from ordinary counts. Separately, the concession ranking
was written and tested but never wired into the prompt, so one side conceded on
every axis at once. With it wired, that side now trades explicitly — giving
scope and deposit to hold the fee.

Model access retries transient provider errors with backoff, after a capacity
spike failed a round outright. Thinking models also spend the token budget on
reasoning before emitting output, so a modest limit returns a truncated
fragment rather than an error; reasoning effort is now set explicitly for
structured replies. Convex features: schema, tables, indexes, queries,
mutations, actions, HTTP actions, Convex Auth.
