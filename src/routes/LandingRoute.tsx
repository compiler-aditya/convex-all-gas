import { Blend } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TEMPLATES } from '../../convex/templates'

/**
 * The landing page.
 *
 * A statement of the mechanism, not a pitch. The worked example does the
 * persuading: two real numbers, and the deal that a normal email thread would
 * have killed. No hero, no card grid, no metrics.
 */
export function LandingRoute() {
  const live = Object.values(TEMPLATES)
  const soon = ['Sublet or rental', 'Used goods', 'Group trip costs']

  return (
    <div className="min-h-dvh bg-background font-sans">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[680px] items-center justify-between px-6 py-4">
          <span className="inline-flex items-center gap-2 text-[15px] font-medium text-foreground">
            <Blend className="size-5" strokeWidth={1.8} aria-hidden="true" />
            overlap
          </span>
          <a
            href="https://github.com/compiler-aditya/convex-all-gas"
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            Source
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[680px] px-6 pt-16 pb-24">
        <h1 className="max-w-[18ch] text-2xl font-semibold leading-tight text-foreground">
          Two people. Two numbers neither will say first.
        </h1>

        <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            A freelancer has a floor. A client has a ceiling. Say yours first and
            you lose, so both of you posture — and deals die even when an
            agreement was always there.
          </p>
          <p>
            Overlap gives each side an agent with its own inbox. Each agent knows
            only its own side's limits. They negotiate by real email, grounded in
            market evidence so neither can bluff, while both of you watch the same
            board and can step in at any point.
          </p>
        </div>

        {/* The worked example carries the argument. Real numbers, mono. */}
        <figure className="mt-8 rounded-md border border-border bg-card p-5">
          <figcaption className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            What that looks like
          </figcaption>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Maya will not go below</dt>
              <dd className="font-mono tabular-nums text-private">₹1,10,000</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">
                Devin can reach — but publicly posted ₹80,000
              </dt>
              <dd className="font-mono tabular-nums text-private">₹1,45,000</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            A normal thread dies here: she reads ₹80,000 as an insult and never
            replies. He never learns she was reachable.
          </p>
          <p className="mt-2 text-sm text-foreground">
            Overlap settles at{' '}
            <span className="font-mono tabular-nums">₹1,25,000</span>. Neither
            number was ever disclosed.
          </p>
        </figure>

        <MechanismDiagram />

        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            to="/rooms/new"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Start a negotiation
          </Link>
          <p className="text-xs text-muted-foreground">
            Joining one? Open the link you were sent — you do not need an account.
          </p>
        </div>

        <section className="mt-14 border-t border-border pt-8">
          <h2 className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            What you can negotiate
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {live.map((template) => (
              <li key={template.id} className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-medium text-foreground">{template.name}</span>
                <span className="text-muted-foreground">{template.summary}</span>
              </li>
            ))}
            {soon.map((name) => (
              <li key={name} className="flex items-baseline gap-x-3 text-muted-foreground/60">
                <span>{name}</span>
                <span className="text-xs">soon</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

/**
 * The mechanism, drawn once.
 *
 * Hairline strokes in the current text colour so it inverts with the theme, and
 * the only colour is on the two private limits — the same ochre that means
 * "yours, never sent" everywhere else in the product.
 */
function MechanismDiagram() {
  return (
    <figure className="mt-10">
      <svg
        viewBox="0 0 640 260"
        className="w-full text-border"
        role="img"
        aria-labelledby="mechanism-title mechanism-desc"
      >
        <title id="mechanism-title">How a negotiation runs</title>
        <desc id="mechanism-desc">
          Each side holds a private limit, visible only to them. Their two agents
          exchange offers by email, grounded in shared market evidence. Both
          people watch the same board.
        </desc>

        <g stroke="currentColor" strokeWidth="1" fill="none">
          <rect x="16" y="70" width="150" height="56" rx="6" />
          <rect x="474" y="70" width="150" height="56" rx="6" />
          <rect x="230" y="70" width="180" height="56" rx="6" />
          <rect x="170" y="196" width="300" height="48" rx="6" />

          <path d="M166 90 H230" />
          <path d="M410 90 H474" />
          <path d="M166 106 H230" strokeDasharray="3 3" />
          <path d="M410 106 H474" strokeDasharray="3 3" />

          <path d="M91 126 V196 H170" />
          <path d="M549 126 V196 H470" />
        </g>

        <g fill="currentColor" className="text-muted-foreground">
          <text x="91" y="94" textAnchor="middle" fontSize="12">your agent</text>
          <text x="91" y="112" textAnchor="middle" fontSize="10">its own inbox</text>
          <text x="320" y="94" textAnchor="middle" fontSize="12">offers by email</text>
          <text x="320" y="112" textAnchor="middle" fontSize="10">cited market evidence</text>
          <text x="549" y="94" textAnchor="middle" fontSize="12">their agent</text>
          <text x="549" y="112" textAnchor="middle" fontSize="10">its own inbox</text>
          <text x="320" y="220" textAnchor="middle" fontSize="12">one board you both watch</text>
          <text x="320" y="236" textAnchor="middle" fontSize="10">either of you can step in</text>
        </g>

        {/* The only colour in the drawing. */}
        <g className="text-private" fill="currentColor">
          <text x="91" y="42" textAnchor="middle" fontSize="11">your limit</text>
          <text x="91" y="56" textAnchor="middle" fontSize="9">private to you</text>
          <text x="549" y="42" textAnchor="middle" fontSize="11">their limit</text>
          <text x="549" y="56" textAnchor="middle" fontSize="9">private to them</text>
        </g>
        <g className="text-private" stroke="currentColor" strokeWidth="1" fill="none">
          <path d="M91 62 V70" />
          <path d="M549 62 V70" />
        </g>
      </svg>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        Neither limit crosses the middle. That is the whole design.
      </figcaption>
    </figure>
  )
}
