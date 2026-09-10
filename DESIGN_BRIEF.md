# Overlap — Frontend & UI/UX Brief

A build brief for the interface. The backend exists and works; this document
specifies what goes on top of it.

Read the whole thing before generating anything. The prohibitions in §3 are not
stylistic preferences — they are the difference between this looking designed
and looking generated.

---

## 1. What the product is

Two people are negotiating. Each holds a number they will not say out loud — a
freelancer's floor, a client's ceiling. Saying it first loses you the deal, so
deals die of posturing even when an agreement was always possible.

Overlap gives each side an **agent with its own email inbox**. Each agent knows
only its own principal's private limits. The agents negotiate by real email,
grounded in scraped market evidence so neither can bluff, while both humans
watch the same live board and can intervene at any point.

It ends one of two ways: an agreement with cited evidence, or an honest no-deal
that names the blocking dimension and nothing else.

**Neither person ever learns the other's limit.** That is the product. The
interface exists to make that guarantee visible and legible.

### The worked example everything should be designed against

> Maya, a freelance developer, will not go below **₹1,10,000**.
> Devin, a founder, can go to **₹1,45,000** but publicly posted **₹80,000**.
>
> A normal email thread dies here: she reads ₹80,000 as an insult and never
> replies. He never learns she was reachable.
>
> Overlap settles at **₹1,25,000** in four rounds. Neither number was disclosed.

Design for that story. If a screen does not help tell it, cut the screen.

---

## 2. Design thesis

**This is an instrument, not an app.**

The register is a financial or legal instrument: precise, quiet, dense where it
needs to be, decorated nowhere. Closer to a term sheet or a trading terminal
than to a SaaS dashboard. The user is doing something consequential with money,
and the interface should feel like it knows that.

Three questions must be answerable in under two seconds, from anywhere:

1. **What here is mine and secret?**
2. **What here is shared and on the record?**
3. **How far apart are we still?**

Everything else is subordinate to those three.

### The central idea: privacy is the layout

The information asymmetry is not a footnote — it is the architecture. The
negotiation room is three columns, and each column *is* one of those questions:

```
┌──────────────────┬────────────────────────────────┬──────────────────┐
│  YOUR POSITION   │      THE SHARED RECORD         │    THE GAP       │
│  (private)       │      (both sides see this)     │  (status)        │
│                  │                                │                  │
│  your limits     │  offers, in order              │  dimension       │
│  your priorities │  each side's reasoning         │  tracks          │
│  never sent      │  cited evidence                │  distance        │
│                  │                                │  actions         │
└──────────────────┴────────────────────────────────┴──────────────────┘
     locked                 on the record               live
```

A user should be able to point at the screen and say "that column is mine, that
column is ours." No tooltip should be required to establish it.

---

## 3. Prohibitions

These are common defaults. None of them appear in this product.

**Never use:**

- Purple/blue/indigo gradients. No gradients at all on surfaces or text.
- Glassmorphism, backdrop blur, translucent floating panels.
- `shadow-xl`, `shadow-2xl`, or any glow. Elevation comes from **hairline
  borders**, not shadow.
- `rounded-2xl` / `rounded-3xl`. Radii are small and consistent (see tokens).
- Emoji as iconography or in UI copy.
- Sparkle/wand/robot icons, or the word "magic". Nothing labelled
  "AI-powered", "Powered by AI", or "✨ AI".
- Centred hero with an oversized headline and two stacked CTA buttons.
- Card grids where every item is a bordered rounded box with an icon on top.
- Animated gradient borders, shimmer, pulsing dots, confetti.
- Generic stock phrases: "Seamlessly", "Effortlessly", "Supercharge",
  "Take your X to the next level", "Welcome back! 👋".
- Placeholder avatars, fake testimonials, fake logos, fake metrics.
- Dark mode as the only mode, or a theme toggle in the top-right as decoration.

**Also avoid:**

- Chat-bubble UI for the negotiation. This is a **record of offers**, not a
  conversation. Bubbles trivialise it and waste horizontal space.
- Progress bars for the negotiation as a whole. Rounds are not a percentage.
- Any use of colour that does not carry meaning defined in §4.

If a component could appear unchanged in a project-management tool, a CRM, and
a fitness app, it is wrong for this one.

---

## 4. Design tokens

### Colour

The palette is **warm neutral**, not cool slate. Cool greys read as dashboard;
warm greys read as paper, contract, ledger. Use Tailwind's `stone` scale as the
neutral base.

**Colour carries exactly two meanings in this product. Nothing else is
coloured.**

| Role | Meaning | Light | Dark |
|---|---|---|---|
| `--private` | This is yours alone. Nobody else can see it. | `#8A5A2B` (warm ochre) | `#C99A5B` |
| `--private-bg` | Field holding private data | `#FBF6EF` | `#2A2118` |
| `--agreed` | Settled, both sides | `#2F6B4F` | `#6FA98A` |
| `--no-deal` | No zone exists | `#8C4A3F` | `#C98878` |
| neutral 50–950 | Everything else | `stone` | `stone` |

Rules:

- **Private ochre is used only for the user's own limits and priorities.** Not
  for buttons, not for links, not for emphasis. When a user sees ochre, it means
  "this is yours and it is not being sent."
- Shared/public content is neutral. Always.
- `agreed` and `no-deal` each appear **once per screen at most**, at the outcome.
- Links are underlined neutral text with `underline-offset-4`. Not blue.
- The primary button is `stone-900` on light, `stone-50` on dark. Solid, no
  gradient, no shadow.

Support both light and dark. Light is the default: this is a document.

### Typography

Numbers are the content of this product. Treat them as first-class.

- **UI text:** system sans stack (`ui-sans-serif, system-ui, -apple-system,
  "Segoe UI", sans-serif`).
- **All figures, limits, offers, ids:** monospace
  (`ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace`) with
  `font-variant-numeric: tabular-nums`. Numbers must align vertically in
  columns and must not jitter when they change.
- Section labels: `11px`, uppercase, `letter-spacing: 0.08em`, `stone-500`.
- Body: `14px` / `1.55`.
- Figures in tracks: `13px` mono.
- The one large type moment per screen: `24px`, weight 600, tight leading. No
  headline above `32px` anywhere in the product, including the landing page.

### Spacing, borders, radius

- 4px base scale. Prefer `12 / 16 / 24 / 32` for real gaps.
- Radius: `6px` default (`rounded-md`), `4px` for inputs and chips. Nothing
  larger.
- Borders: `1px solid stone-200` (light) / `stone-800` (dark). This is the
  primary means of separating regions — **not** shadow, **not** background fills.
- Dividers between offers: `1px` hairline, full-bleed within the column.

### Motion

Motion is reserved for one thing: **an offer landing.** Everywhere else, no
animation.

- New round enters: 220ms, `cubic-bezier(0.2, 0, 0, 1)`, 8px translate from the
  side that sent it, opacity 0→1. No scale, no bounce, no spring.
- Dimension-track marker moves: 400ms, same easing. The marker *slides* to its
  new position so the eye tracks the movement — this is how the user perceives
  the gap closing.
- Respect `prefers-reduced-motion: reduce` — disable both, keep the state change.

---

## 5. The signature component: Dimension Track

This is the most important thing in the product. Build it first and build it
well; everything else is supporting structure.

One track per negotiable dimension (rate, delivery window, scope, revisions,
upfront %). It answers "how far apart are we on this axis" **without ever
revealing the other side's limit.**

```
  Total fee                                            ₹ mono
  ┌────────────────────────────────────────────────────────────┐
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
  │        ▲                    ●              ○               │
  │     your floor           their offer    your offer         │
  └────────────────────────────────────────────────────────────┘
     ₹1,10,000                 ₹1,15,000      ₹1,25,000
     yours · not sent
```

**What is drawn:**

- A horizontal track spanning a sensible display range.
- **Your own acceptable region**, shaded in `--private-bg` with a `--private`
  edge at your limit. Labelled in ochre with the caption `yours · not sent`.
- **Your latest offer** — hollow marker, neutral stroke.
- **Their latest offer** — filled neutral marker.
- When settled: a single `--agreed` marker at the final value, and the two offer
  markers fade to `stone-300`.

**What is never drawn, under any circumstance:**

- The other side's limit, region, or floor/ceiling.
- Any derived value that would let it be inferred (a midpoint, a "gap: ₹X to
  their limit", a percentage of their range).

There is no query that returns the other side's bounds. If a component appears
to need one, the component is wrong.

**Hard-limit dimensions** (the user marked "cannot move") get a solid edge
instead of a soft one, and the caption `fixed`.

**Empty state:** before the counterparty submits, tracks render with your region
only and the caption `waiting for the other side`.

---

## 6. Screens

Build in this order. Screen 6 is the one the demo video is made of — budget
disproportionate care there.

### 6.1 Landing (public, unauthenticated)

Not a marketing page with a hero. A **statement of the mechanism.**

- Left-aligned. Max content width `680px`. Generous top margin.
- Opens with the problem in plain language — two or three sentences, the Maya
  and Devin numbers rendered in mono inline. Let the example do the persuading.
- A single static diagram of the mechanism: two inboxes, evidence between them,
  one shared board. Inline SVG, hairline strokes, no colour except `--private`
  on the two private-limit callouts.
- One action: **Start a negotiation**. Secondary text link: *joining one? use
  the link you were sent.*
- Below: the four templates as a plain list with one-line descriptions.
  Freelance contract is live; sublet, used goods and group trip are marked
  `soon` in `stone-400`. Not cards. A list.
- No testimonials, no logo wall, no metrics, no pricing, no footer links beyond
  the repo.

### 6.2 Sign in

Exists already at `src/components/SignIn.tsx` — restyle only, do not redesign
the flow. Email + password, and a toggle between sign in and create account.

Keep the existing copy: *"You only need an account to start a negotiation. The
other side joins by link."* That sentence removes the biggest objection a
visitor has, and it belongs on this screen.

Error messages stay deliberately vague — they must not reveal whether an
address has an account.

### 6.3 Dashboard

A **table**, not a card grid. Columns: room title, counterparty, status, last
activity. Status as a text chip with a hairline border — no filled pills, no
colour except `agreed` / `no_deal`.

Empty state is one line of text and one button. No illustration.

### 6.4 Create room

Three steps on one page, not a wizard with a progress bar:

1. **Template** — pick one. Freelance is the only live option.
2. **Context** — paste the URL this negotiation is about (job post, listing).
   Optional; explain in one line that it is used to gather evidence, and that
   scraped figures are shown to both sides but never set anyone's limits.
3. **Your position** — the private bounds form (§6.5).

The counterparty's name and your own display name are two small fields, not a
section.

### 6.5 The private bounds form

The most delicate screen in the product. The user is typing the number they have
refused to say out loud. The interface has to earn that.

- The whole form sits on `--private-bg` with a `--private` left rule, and is
  headed `Private — only you will ever see this. Your agent uses it; it is never
  sent to the other side.` Say it once, plainly, at the top. Do not repeat it
  per field.
- One row per dimension:
  - Label, and the dimension's `help` text in `stone-500` at `12px`.
  - **One** number input — the user's limit. Which limit depends on
    `higherFavors`: if the dimension favours their side, they are setting a
    **minimum** ("never below"); otherwise a **maximum** ("never above"). Label
    it in those words, never as "min/max".
  - A **priority** control, 1–5, rendered as five discrete segments, not a
    slider with a floating tooltip. Maps to `weight` 0.2–1.0.
  - A `cannot move` checkbox → `isHard`.
- Money inputs: mono, right-aligned, grouped with locale separators as typed.
- Inline validation only on blur. The one server error worth designing for is
  *minimum above maximum*.
- Submit: **Lock in my position**. After submit, the form collapses to a compact
  read-only summary that stays visible in the left column of the room.

### 6.6 The negotiation room — the screen that matters

Three columns as in §2. On desktop: `320px / 1fr / 380px`.

**Left — YOUR POSITION (private)**

The collapsed bounds summary. Ochre rule, `--private-bg`, `yours · not sent` at
the bottom. Includes an `Edit` affordance, disabled once the negotiation starts.

**Centre — THE SHARED RECORD**

A vertical record of offers, oldest at top, newest at bottom, auto-scrolled to
newest. Each entry:

```
ROUND 3 · FREELANCER                                    ·  2 min ago
─────────────────────────────────────────────────────────────────────
We are happy to accommodate the expanded scope of 4 screens and lower
the upfront payment to 40% to facilitate the project kickoff. To ensure
professional React development standards within this scope, we propose
a rate of ₹125,000 and a 32-day delivery window.

  Total fee          ₹125,000        ↓ from ₹135,000
  Delivery window    32 days         ↓ from 35
  Scope              4 screens       ↑ from 3
  Revision rounds    3               ↑ from 2
  Paid upfront       40%             ↓ from 50

  Based on   upwork.com/hire/react-js-developers/cost   ↗
```

- Round label and side in `11px` uppercase tracking. The two sides are
  distinguished by **alignment of the rule and label**, not by colour or avatars.
- The rationale is the hero of the entry. Set at `14px`, comfortable measure,
  full sentences. This is the agent's actual argument and it is what makes the
  product feel alive — do not truncate it, do not put it in a tooltip.
- Beneath it, the terms as a mono two-column list with **deltas from that side's
  previous offer**, arrow and prior value in `stone-400`. The deltas are what
  make the trade legible: a reader should see at a glance that this side gave on
  scope and upfront to hold the fee.
- Citations as underlined source hostnames with an external-link glyph.
- New entries animate in per §4.

**Right — THE GAP**

- The dimension tracks (§5), stacked.
- Round counter: `round 4 of 8`, mono, plain text.
- **The intervene box.** A single-line input, always visible, never behind a
  modal: placeholder *"Tell your agent something — e.g. if she can start Monday
  I'll go to 60% upfront"*. On submit it appears immediately in the left column
  as a small ochre note (`your instruction`) — instructions are private, so they
  live on the private side, not in the shared record.
- Status line at the bottom: whose turn, or `waiting for delivery`.

**States the room must handle, all designed, none as a spinner:**

| State | Treatment |
|---|---|
| `awaiting_counterparty` | Centre column shows the invite link with a copy button, and the sentence *only send this to someone you are already dealing with*. |
| Counterparty joined, bounds pending | `waiting for the other side to set their position` |
| `grounding` | *gathering evidence* with the source list filling in as rows arrive |
| `negotiating`, no rounds yet | *your agent is preparing its opening offer* |
| `agreed` | §6.7 |
| `no_deal` | §6.7 |
| Query loading | Skeleton rows matching final layout. No spinners, no "Loading…" |

**Realtime is the point.** Everything binds to `useQuery`, which is already live
— no polling, no refresh button. Two browser windows side by side must both
update as rounds land. That is the demo.

### 6.7 Outcome

**Agreed.** The terms as a clean settlement table, mono figures, each with its
citations. `--agreed` used once, on the heading rule. Then the confirmation
gate, which matters:

> Both sides confirm before this is binding. Your agent negotiated it; it has
> not agreed to anything on your behalf.

Two confirmation states shown honestly: `you confirmed` / `waiting on the other
side`. Never imply the deal is done until both are true.

**No deal.** Restrained, not an error state. One line:

> No agreement is possible on **Total fee**.

Then, in `stone-500`: *Neither side's limits were revealed. You can reopen with
different limits.* Show the dimension only — never a number, never a gap size,
never "you were ₹X apart."

---

## 7. Data contract

Convex, already deployed. Bind with `useQuery` / `useMutation` from
`convex/react`. Everything is reactive; there is no fetch layer to write.

**Live now:**

```ts
useQuery(api.rooms.myRooms)              // [{ roomId, title, templateId, status }]
useQuery(api.rooms.getRoom,   { roomId, joinToken? })
useQuery(api.bounds.myBounds, { roomId, joinToken? })
useQuery(api.grounding.roomGrounding, { roomId, joinToken? })

useMutation(api.rooms.createRoom)        // → { roomId, joinToken }
useMutation(api.rooms.joinRoom)
useMutation(api.bounds.setMyBounds)
```

`getRoom` returns:

```ts
{
  title, templateId, status, contextUrl, currentRound, maxRounds,
  mySide: "a" | "b",
  myDisplayName, myBoundsSubmitted,
  counterpartyName, counterpartyJoined, counterpartyBoundsSubmitted,
}
```

Note what is absent: any field carrying the counterparty's bounds. That is
deliberate and permanent.

**Being added (assume these shapes):**

```ts
useQuery(api.rounds.roomRounds, { roomId, joinToken? })
// [{ index, bySide, proposal: Record<string, number>, rationale,
//    citations: [{ url, title }], createdAt }]

useQuery(api.rounds.roomAgreement, { roomId, joinToken? })
// null | { terms, citations, confirmedBySideA, confirmedBySideB, settledAt }

useMutation(api.rounds.startNegotiation)   // { roomId }
useMutation(api.rounds.addIntervention)    // { roomId, joinToken?, text }
useMutation(api.rounds.confirmAgreement)   // { roomId, joinToken? }
```

**`joinToken`** — the counterparty has no account. They arrive at
`/room/:roomId?t=<token>` and every query and mutation they make must pass that
token through. Read it once from the URL, hold it in context, thread it into
every call. If it is missing for a token-based user, the backend refuses; render
the not-a-participant state rather than an error dialog.

**Templates** are defined in `convex/templates/index.ts`. The frontend must not
hardcode dimensions. Freelance has five:

| key | label | type | higherFavors | unit |
|---|---|---|---|---|
| `rate` | Total fee | money | `a` | ₹ |
| `deliveryDays` | Delivery window | days | `a` | days |
| `scopeUnits` | Scope | count | `b` | screens |
| `revisions` | Revision rounds | count | `b` | rounds |
| `upfrontPercent` | Paid upfront | percent | `a` | % |

`higherFavors` drives whether a user sets a minimum or a maximum, and which way
a track's shading runs. Derive it; never hardcode per-dimension logic.

---

## 8. Technical constraints

**Non-negotiable:**

- **Vite + React 19 + TypeScript. Not Next.js.** No `next/link`, `next/image`,
  `next/font`, no `"use client"`, no `app/` directory, no server components, no
  server actions. Components must be plain React that runs in a Vite SPA.
- **Tailwind v4** — configured via `@theme` in `src/index.css`, not a
  `tailwind.config.js`.
- **shadcn/ui** for primitives (button, input, dialog, tooltip). Restyle to the
  tokens above; do not ship the defaults.
- Path alias `@/*` → `./src/*` is configured.
- Client routing: add `react-router-dom`. Routes: `/`, `/rooms`, `/rooms/new`,
  `/room/:roomId`. SPA fallback is already handled by the host, so deep links
  work.
- Hosting is Convex static hosting — the build output is `dist/`. Nothing
  server-side is available at runtime.

**Accessibility, treated as a requirement not a pass:**

- Every input has a real `<label>`. No placeholder-as-label.
- Focus rings visible, `2px`, offset `2px`. Do not remove outlines.
- The offers record is a `<ol>`; new entries announced via `aria-live="polite"`.
- Contrast: body text ≥ 7:1, secondary ≥ 4.5:1. Check the ochre on
  `--private-bg` specifically — it is the pairing most likely to fail.
- Full keyboard path: create a room, fill bounds, submit, intervene.
- Colour never carries meaning alone. `agreed` / `no_deal` always have text.

**Responsive:**

- Below `1024px` the three columns stack: shared record first, gap second, your
  position collapsed into a disclosure at the top.
- Tracks stay horizontal at all widths; they compress, never wrap.
- No horizontal page scroll at `375px`.

---

## 9. Copy guidelines

Write like a competent person explaining something consequential, not like a
product marketer.

- Plain, specific, unhurried. Short sentences.
- Never "AI" as a noun in the UI. It is **your agent**.
- Never celebratory. No "Nice!", no "You're all set!", no exclamation marks.
- Say what is private, every time it matters, in the same words: *only you will
  ever see this.*
- Numbers are always formatted with locale separators and their unit.
- Errors state what happened and what to do. Never "Oops" or "Something went
  wrong".

Two sentences that should appear verbatim, because they do the most work:

> Only you will ever see this. Your agent uses it; it is never sent to the other
> side.

> Both sides confirm before this is binding. Your agent negotiated it; it has
> not agreed to anything on your behalf.

---

## 10. Definition of done

- [ ] Two browser windows, same room, both update live as a round lands.
- [ ] Nowhere in the DOM — not hidden, not in a prop, not in a network response
      — does one side's limit appear in the other's session.
- [ ] The dimension tracks make "we are close" or "we are far" readable at a
      glance without reading a number.
- [ ] An offer's deltas show at a glance that a side traded across dimensions
      rather than simply conceding.
- [ ] The intervene box is reachable and usable without leaving the room.
- [ ] No-deal names a dimension and no numbers.
- [ ] Agreement requires both confirmations, and says so before either is given.
- [ ] Keyboard-only path through create → bounds → room works.
- [ ] Nothing from §3 appears anywhere.
