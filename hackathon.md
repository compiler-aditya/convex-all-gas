# Hackathon log

- **Project:** convex-all-gas
- **Event:** Convex All Gas Hackathon
- **What it does:** Two agents with their own inboxes negotiate by email on behalf of two people, each holding one side's private limits, so a deal is found without either side revealing their number.
- **Live app:** not deployed
- **Repo:** private
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, actions, HTTP actions, Convex Auth
- **Auth:** Convex Auth
- **AI models:** gemini-3.5-flash (development; provider is switchable by env var)
- **Started:** 2026-09-09T17:31:07Z
- **Last updated:** 2026-09-11T03:32:25Z

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

### 2026-09-10 - working tree
The negotiation now runs over real email, agent to agent
(`convex/email.ts`, `convex/http.ts`). Each side is assigned an inbox from the
shared pool, a completed round is rendered as a message and sent, and the
inbound webhook advances the negotiation to the other side's turn. Delivery is
what drives the loop, so exactly one mechanism moves a negotiation forward and
the offline loop and the email loop can never both run.

A full negotiation completed this way: three messages between two agent
inboxes, ending in agreement on terms inside both sides' limits. The chain was
advanced only by webhooks, which fire on genuine delivery, so the round trip is
real rather than simulated.

The routing fix the earlier spike called for is in place. Sends record their
Message-Id against the room, the first inbound event matches on it, and the
recipient's thread identifier is learned and stored from there — after which
routing works by thread as originally intended. Both directions were observed
being learned during the run.

One provider constraint cost a send: the idempotency header rejects characters
outside a narrow set, and a colon in the key returned a validation error rather
than sending. Transport is switchable, with a mock that records what would have
been sent so tests do not consume a limited daily send quota; live remains the
default so a demonstration cannot quietly run on the mock.

### 2026-09-10 - working tree
Wrote the interface specification and completed the public API it binds to.

The brief treats the information asymmetry as the architecture rather than a
feature to explain: the negotiation room is three columns that each answer one
question — what is mine and secret, what is shared and on the record, how far
apart we still are. It specifies a per-dimension track that draws the viewer's
own limit and both sides' offers while never drawing the counterparty's limit or
any value it could be inferred from, and carries a prohibitions section because
the default output of a generative interface tool is decoration this product
cannot afford.

The public surface is now complete (`convex/rounds.ts`). Offers, citations and
settled terms are shared, since both sides negotiated them. Instructions to your
own agent are not: telling an agent what you would accept discloses your
position as directly as a limit does, so those are scoped to the caller exactly
as limits are. Five more tests cover it, and the privacy test was verified by
removing the scoping filter to confirm it fails when the guarantee fails.

Confirming an agreement sets only the caller's own flag, and nothing is binding
until both are set. Starting a negotiation refuses politely when a side has not
set a position rather than throwing, so the interface can render the reason
instead of an error.

### 2026-09-10 - working tree
The interface now runs on live data. The room components were decoupled from
their fixtures behind a small context, so the same components render against
mock data in a design preview and against Convex in the application
(`src/components/negotiation/room-context.tsx`, `src/lib/live-room.ts`). The
counterparty reaches a room through a link carrying a token, which authenticates
every query and mutation they make without an account
(`src/routes/RoomRoute.tsx`).

Per-dimension comparison tracks were already built but collapsed behind
accordions, so the one view that shows how far apart the two sides are was
never on screen. Terms still under negotiation now open by default. Display
scales are derived from the public offers and the viewer's own limit, so they
adapt to real values and still cannot disclose anything.

Verified against a real negotiation rather than fixtures: the room renders the
settled state, the track shows the viewer's own ceiling marked fixed, and a
search of the rendered document confirms the other side's floor appears nowhere
in it while the viewer's own limit does — so the check is meaningful rather
than vacuous.

Three faults were fixed on the way. A viewer may leave a term unbounded, which
crashed a track that assumed a limit always exists; those terms now show the
public comparison and say plainly that nothing private backs it. The
counterparty's name was hardcoded in five places. And the application entry
point had been replaced by a fixtures-only harness, so the product booted into
mock data.

### 2026-09-10 - working tree
A negotiation can now be started from the interface rather than the command
line (`src/routes/CreateRoomRoute.tsx`, `src/routes/BoundsRoute.tsx`). Creating
a room asks what the negotiation is about and which side you are; limits are a
separate screen, because that screen has to earn a number the user has refused
to say aloud. It states the promise once, plainly, and marks the whole form as
private rather than repeating a warning per field.

Which limit a term takes is derived, never hardcoded. The same form asks the
freelancer for a minimum and the client for a maximum, from the template's
own description of who a higher value favours.

Walked end to end in a browser across two sessions. The creator signs in,
creates a room, locks in a position, and gets a link. The counterparty opens
that link with no account, sets their own limits, and both sides then see that
both positions are in. A term left blank is treated as no opinion rather than
as zero.

One behaviour worth recording: opening your own invite link while signed in
shows your own view, because the caller is resolved from the session before the
link token is considered. That is correct, and it means a demonstration needs
two separate browser sessions rather than two tabs.

### 2026-09-10 - working tree
A landing page and a sign-in screen in the product's own visual language
(`src/routes/LandingRoute.tsx`, `src/components/SignIn.tsx`). The landing page
states the mechanism rather than selling it: the worked example carries the
argument, with the two private figures set in the colour that means "yours,
never sent" everywhere else. A single drawing shows two agents with their own
inboxes exchanging cited offers over one shared board, in hairline strokes with
colour used only on the two private limits.

Routing was restructured so the landing page is public, the negotiation room
stays reachable without an account, and only room creation is gated. Previously
the first screen a visitor saw was a bare sign-in form in a different visual
language from the product.

Reactivity was verified without spending any of the daily email allowance. With
a room open in a browser and untouched, rounds were driven through the offline
path; the heading, the term comparison and three dimension tracks all appeared
without a reload. The two paths write identical rounds, so the live view behaves
the same whichever drives it.

### 2026-09-10 - working tree
Adopted a designed landing page and added Google sign-in.

The landing page replaces the one written earlier. Its hero is the product's
thesis as a picture: two overlapping circles labelled with each side's own
private brief, meeting in the middle. Its calls to action were rewired to the
application's real routes — one starts a negotiation, the rest open a worked
example that needs no account, which is a reasonable thing for a visitor to
want before committing to anything.

Merging it needed care. The branch was six commits behind and had reverted the
room to fixtures, so a straight take would have undone the live data wiring.
The room kept its context-driven version and gained the appearance hook the
branch introduced; the page metadata and a theme script that runs before paint
were taken wholesale.

The branch also brought tests for the landing page, which failed after the
routes changed. They were updated rather than deleted: they check that every
in-page anchor resolves to an element that exists, that the example is labelled
as an example, and that no sign-up form appears on a page that promises none.

Sign-in now offers Google alongside a password. Password is kept deliberately —
the test suite authenticates with it, and local development should not require
external credentials to exist (`convex/auth.ts`).

### 2026-09-11 - working tree
Deployed to production and finished provisioning it. The site serves the current
build, every route resolves, the authentication discovery documents return real
JSON, and the signed webhook endpoint answers at its own address. Production has
its own signing keypair, its own database, and its own inbox pool, seeded
separately because a deployment shares no state with any other.

Sign-in now shows the Google option only when the deployment actually holds
Google credentials (`convex/providers.ts`). Offering a button that cannot
complete is worse than not offering one, and a visitor cannot tell a
misconfigured control from a broken product. The check reports presence, never
values, so it discloses nothing — and the button turns itself on the moment the
credentials are set, with no code change. Verified in both directions:
placeholder credentials made it appear, removing them made it vanish.

Password sign-in stays the path that always works, since it depends on no
external account.
