# Hackathon log

- **Project:** convex-all-gas
- **Event:** Convex All Gas Hackathon
- **What it does:** Not documented yet
- **Live app:** not deployed
- **Repo:** private
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes
- **Auth:** none
- **AI models:** none
- **Started:** 2026-09-09T17:31:07Z
- **Last updated:** 2026-09-09T22:05:29Z

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

### 2026-09-09 - working tree
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
