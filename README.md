# Overlap

**Two agents. Two private limits. A deal neither side had to reveal.**

Live: **https://expert-wolverine-992.convex.site**
Worked example, no account needed: **https://expert-wolverine-992.convex.site/demo**

Built for the [Convex All Gas Hackathon](https://vibeapps.dev/tag/allgashackathon)
— Convex, OpenAI, Firecrawl, AgentMail.

---

## The problem

Two people negotiating each hold a number they will not say out loud. A
freelancer has a floor. A client has a ceiling. Say yours first and you lose, so
both sides posture — and deals die even when an agreement was always possible.

> Maya will not go below **₹1,10,000**.
> Devin can reach **₹1,45,000**, but publicly posted **₹80,000**.
>
> A normal email thread dies here: she reads ₹80,000 as an insult and never
> replies. He never learns she was reachable.
>
> Overlap settles at **₹1,25,000**. Neither number was ever disclosed.

## How it works

Each side gets an **agent with its own email inbox**. Each agent knows only its
own principal's limits. They negotiate by real email, grounded in scraped market
evidence so neither can bluff, while both people watch the same live board and
can intervene at any point.

It ends one of two ways: an agreement with cited evidence that both people must
confirm, or an honest no-deal that names the blocking dimension and nothing
else.

```
   your limit                                      their limit
   private to you                                private to them
        │                                                │
   ┌────┴─────┐      offers by email       ┌──────────────┴──┐
   │your agent│ ◀──  cited evidence  ──▶   │   their agent   │
   └────┬─────┘                            └──────────┬──────┘
        └──────────▶ one board you both watch ◀───────┘
```

## What each sponsor tool actually does

| | |
|---|---|
| **Convex** | Database, server functions, scheduling, HTTP actions, auth, realtime subscriptions, and static hosting. The whole backend. |
| **AgentMail** | Real inboxes for the agents. Offers are genuine email with signed webhooks; delivery is what advances a round. |
| **Firecrawl** | Scrapes the context page into structured terms and searches market comparables, so every proposal cites something checkable. |
| **OpenAI / Gemini** | Generates proposals and their reasoning. Provider is switchable by environment variable. |

## The design idea

The information asymmetry is the architecture. The negotiation room is three
regions that each answer one question: **what is mine and secret**, **what is
shared and on the record**, **how far apart are we**.

Per-dimension tracks show your own limit and both sides' offers — and never the
counterparty's limit, or any value it could be inferred from. There is no query
anywhere that returns the other side's bounds.

Full interface specification: [`DESIGN_BRIEF.md`](DESIGN_BRIEF.md).
Build log: [`hackathon.md`](hackathon.md).

## Guarantees, and how they are enforced

- **Neither side learns the other's limit.** Callers are resolved to a
  participant server-side from session or join token; a participant id is never
  accepted as an argument. Covered by tests that were verified by deliberately
  breaking the scoping to confirm they fail.
- **The model proposes; the server decides.** Every generated proposal is
  validated against the proposer's own limits before it can become an email.
  A model hallucinating past its own floor is caught, not sent.
- **Nothing binds without both people.** Agents converge; the humans confirm.
  Both confirmations are required and the interface says so before either.
- **No cold email, ever.** Invites go only to someone you are already dealing
  with. This product never contacts a stranger on your behalf.

## Running it

```bash
npm install
npx convex dev          # provisions a deployment and writes .env.local
npm run dev             # http://localhost:5173
```

Set these on the deployment (never in the repo):

```bash
npx convex env set GEMINI_API_KEY ...      # or OPENAI_API_KEY
npx convex env set FIRECRAWL_API_KEY ...
npx convex env set AGENTMAIL_API_KEY ...
npx convex env set AGENTMAIL_WEBHOOK_SECRET ...
```

Sign-in offers Google when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set,
and falls back to password otherwise. Email sending can be pointed at a mock
with `EMAIL_TRANSPORT=mock`, which keeps tests off a limited daily quota.

```bash
npm test                # 63 tests
npm run build
npm run deploy          # production
```

`npm run dev` also serves a fixtures-only component preview at
`/preview.html`, which needs no backend.

## Layout

```
convex/
  schema.ts        11 tables, plus Convex Auth's
  engine/          scoring, overlap detection, proposal generation
  rounds.ts        the public API the interface binds to
  email.ts         inbox pool, sending, routing
  grounding.ts     Firecrawl scrape + comparables
  lib/access.ts    caller resolution — the security core
src/
  components/landing/      the public page
  components/negotiation/  the room
  routes/                  create, bounds, room, demo
```

## Licence

Not yet chosen. Until a `LICENSE` file is added, default copyright applies and
the code is not licensed for reuse.
