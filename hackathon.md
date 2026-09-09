# Hackathon log

- **Project:** convex-all-gas
- **Event:** Convex All Gas Hackathon
- **What it does:** Not documented yet
- **Live app:** not deployed
- **Repo:** private
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, actions, HTTP actions
- **Auth:** none
- **AI models:** none
- **Started:** 2026-09-09T17:31:07Z
- **Last updated:** 2026-09-09T23:03:54Z

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

### 2026-09-09 - working tree
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
