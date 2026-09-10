import { useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Blend, BriefcaseBusiness, Check, Handshake, House, ListChecks, LockKeyhole, Menu, Monitor, Moon, ShieldCheck, Sun, X } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { nextAppearance, useAppearance, type Appearance } from '@/hooks/use-appearance'
import { NegotiationPreview } from './negotiation-preview'
import { questions } from './landing-content'

const navigation = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#why-overlap', label: 'Why Overlap' },
  { href: '#questions', label: 'FAQs' },
] as const

function Wordmark() {
  return <a className="wordmark" href="/" aria-label="Overlap home"><Blend className="brand-symbol" strokeWidth={1.8} aria-hidden="true" />overlap</a>
}

function DemoLink({ size = 'lg', label = 'Explore the demo' }: { size?: 'default' | 'lg'; label?: string }) {
  return <a href="/?demo=1" className={buttonVariants({ size, className: 'rounded-full' })}>{label}<ArrowUpRight data-icon="inline-end" aria-hidden="true" /></a>
}

function LandingHeader({ appearance, setAppearance }: { appearance: Appearance; setAppearance: (value: Appearance) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)
  const AppearanceIcon = appearance === 'system' ? Monitor : appearance === 'light' ? Sun : Moon
  const next = nextAppearance(appearance)

  return (
    <header className="landing-header" onKeyDown={(event) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        menuRef.current?.focus()
      }
    }}>
      <div className="landing-container">
        <div className="landing-header-row">
          <Wordmark />
          <nav aria-label="Main navigation" className="landing-desktop-nav">
            {navigation.map((link) => <a href={link.href} key={link.href}>{link.label}</a>)}
          </nav>
          <div className="landing-header-actions">
            <Button variant="ghost" size="icon" onClick={() => setAppearance(next)} aria-label={`Appearance: ${appearance}. Switch to ${next} mode`} title={`Appearance: ${appearance}. Switch to ${next}`}>
              <AppearanceIcon aria-hidden="true" />
            </Button>
            <div className="landing-header-cta"><DemoLink size="default" /></div>
            <div className="landing-menu-toggle">
              <Button ref={menuRef} size="icon" variant="ghost" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="landing-mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>
        <nav id="landing-mobile-navigation" className="landing-mobile-nav" aria-label="Mobile navigation" hidden={!menuOpen}>
          {navigation.map((link) => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}<ArrowUpRight className="size-4" aria-hidden="true" /></a>)}
          <a href="/?demo=1" onClick={() => setMenuOpen(false)}>Explore the demo<ArrowUpRight className="size-4" aria-hidden="true" /></a>
        </nav>
      </div>
    </header>
  )
}

function CommonGroundIllustration() {
  return (
    <figure className="landing-hero-art">
      <div className="landing-venn-private" aria-hidden="true">
        <span><LockKeyhole className="size-4" />Your private brief</span>
        <span><LockKeyhole className="size-4" />Their private brief</span>
      </div>
      <div className="landing-venn" role="img" aria-label="Your priorities and their priorities can overlap to create common ground. Each person’s private brief stays on their own side.">
        <div className="landing-venn-circle landing-venn-yours" />
        <div className="landing-venn-circle landing-venn-theirs" />
        <div className="landing-venn-overlap" />
        <div className="landing-venn-labels" aria-hidden="true">
          <div className="landing-venn-person"><span>You.</span><span>Your priorities</span></div>
          <div className="landing-venn-center"><Blend className="size-8" strokeWidth={1.4} /><span>Common<br />ground.</span></div>
          <div className="landing-venn-person"><span>Them.</span><span>Their priorities</span></div>
        </div>
      </div>
      <div className="landing-venn-connector" aria-hidden="true" />
      <figcaption className="landing-venn-caption">
        <span className="landing-outcome-check"><Check className="size-5" aria-hidden="true" /></span>
        <span>A way forward.<small>That works for both of you.</small></span>
      </figcaption>
      <p className="landing-art-footnote">Not a tug of war. A meeting of minds.</p>
    </figure>
  )
}

function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-container">
        <div className="landing-hero-layout">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">YOUR AGENT. YOUR TERMS.</p>
            <h1 id="landing-title" className="text-balance">Different sides.<br /><span>Common ground.</span></h1>
            <p className="landing-hero-description text-pretty">Your priorities matter. So do theirs. Overlap gives each of you an agent to explore the terms—and find a deal that works for both.</p>
            <div className="landing-hero-action-wrap">
              <div className="landing-hero-actions">
                <DemoLink />
                <a href="#how-it-works" className="landing-text-link">See how it works<ArrowDown className="size-4" aria-hidden="true" /></a>
              </div>
              <p className="landing-hero-footnote">An interactive preview. No sign-up required.</p>
            </div>
          </div>
          <CommonGroundIllustration />
        </div>
      </div>
    </section>
  )
}

function ProductPrinciples() {
  return (
    <div className="landing-principle-bar">
      <div className="landing-container">
        <ul className="landing-principle-list" aria-label="Overlap principles">
          <li><LockKeyhole className="size-5" aria-hidden="true" />Private where it matters</li>
          <li><ShieldCheck className="size-5" aria-hidden="true" />Your boundaries, respected</li>
          <li><Handshake className="size-5" aria-hidden="true" />Both sides have a say</li>
        </ul>
      </div>
    </div>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section" aria-labelledby="landing-process-heading">
      <div className="landing-container">
        <div className="landing-section-stack">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">LESS BACK-AND-FORTH. MORE FORWARD.</p>
            <h2 id="landing-process-heading" className="text-balance">You set the boundaries.<br /><span>Let your agent take it from there.</span></h2>
            <p className="landing-section-description">A private brief. A shared conversation. A clear decision.</p>
          </div>
          <NegotiationPreview />
        </div>
      </div>
    </section>
  )
}

const benefits = [
  { icon: LockKeyhole, title: 'An agent in your corner.', description: 'Be honest about what matters to you. Your private priorities guide your agent, not the other person’s bargaining position.' },
  { icon: ShieldCheck, title: 'Flexible terms. Firm boundaries.', description: 'Move on the things you can. Hold the line on the things you can’t. Finding common ground shouldn’t mean giving yourself away.' },
  { icon: ListChecks, title: 'Clarity, not another email thread.', description: 'See what changed, what matches, and what’s still open. Keep the full proposal in view—not buried in back-and-forth.' },
] as const

function WhyOverlap() {
  return (
    <section id="why-overlap" className="landing-section landing-why-section" aria-labelledby="landing-why-heading">
      <div className="landing-container">
        <div className="landing-why-layout">
          <figure className="landing-editorial-image">
            <img src="/images/common-ground.webp" alt="Two green chairs facing one another across a small oak table, with papers ready for a conversation." width={1024} height={1024} loading="lazy" decoding="async" />
            <figcaption>There&apos;s room for both sides at the table.</figcaption>
          </figure>
          <div className="landing-why-copy">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">BUILT AROUND PEOPLE, NOT POSITIONS.</p>
              <h2 id="landing-why-heading" className="text-balance">A little less friction.<br /><span>A lot more clarity.</span></h2>
            </div>
            <ul className="landing-benefits">
              {benefits.map(({ icon: Icon, title, description }) => (
                <li key={title}>
                  <Icon className="size-5" aria-hidden="true" strokeWidth={1.6} />
                  <div><h3>{title}</h3><p>{description}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

const useCases = [
  { icon: BriefcaseBusiness, name: 'Freelance projects', detail: 'The right scope. The right rate.', description: 'Balance the fee, delivery date, revisions, and payment terms—without losing sight of the work.' },
  { icon: House, name: 'Rental conversations', detail: 'A place that works for both.', description: 'Explore the rent, move-in timing, and terms that make a place feel right for everyone involved.' },
  { icon: Handshake, name: 'Work & opportunities', detail: 'A better next chapter.', description: 'Find room across compensation, start dates, and flexibility. There’s more to an offer than one number.' },
] as const

function UseCases() {
  return (
    <section id="possibilities" className="landing-section" aria-labelledby="landing-use-cases-heading">
      <div className="landing-container">
        <div className="landing-section-stack">
          <div className="landing-use-cases-intro">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">FOR THE CONVERSATIONS THAT MATTER.</p>
              <h2 id="landing-use-cases-heading" className="text-balance">Different conversations.<br /><span>The same common ground.</span></h2>
            </div>
            <p className="landing-section-description">Whenever there are two sides and a few moving parts, there may be more room than you think.</p>
          </div>
          <div className="landing-use-cases">
            {useCases.map(({ icon: Icon, name, detail, description }) => (
              <article key={name} className="landing-use-case">
                <div className="landing-use-case-heading"><Icon className="size-6" strokeWidth={1.5} aria-hidden="true" /><h3>{name}</h3></div>
                <div className="landing-use-case-copy"><p>{detail}</p><p>{description}</p></div>
              </article>
            ))}
          </div>
          <p className="landing-use-case-note">A few possibilities. The interactive demo follows a freelance website project.</p>
        </div>
      </div>
    </section>
  )
}

function FrequentlyAskedQuestions() {
  return (
    <section id="questions" className="landing-section landing-questions-section" aria-labelledby="landing-questions-heading">
      <div className="landing-container">
        <div className="landing-questions-layout">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">A LITTLE MORE CLARITY.</p>
            <h2 id="landing-questions-heading" className="text-balance">Good questions.<br /><span>Straight answers.</span></h2>
            <p className="landing-section-description">New to the idea? Here&apos;s a good place to start.</p>
            <a className="landing-text-link" href="/?demo=1">Or take a look around<ArrowRight className="size-4" aria-hidden="true" /></a>
          </div>
          <Accordion defaultValue={['demo']} className="landing-faq">
            {questions.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger id={`faq-${item.id}`}>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

function LandingClosing() {
  return (
    <section className="landing-closing" aria-labelledby="landing-closing-heading">
      <div className="landing-container">
        <div className="landing-closing-panel">
          <div className="landing-closing-content">
            <Blend className="size-10" strokeWidth={1.25} aria-hidden="true" />
            <h2 id="landing-closing-heading" className="text-balance">There&apos;s a better way<br />to meet in the middle.</h2>
            <p>See what a little common ground can do.</p>
            <DemoLink />
            <p className="landing-closing-note">No account. No commitment. Just explore.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function LandingFooter({ appearance, setAppearance }: { appearance: Appearance; setAppearance: (value: Appearance) => void }) {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="landing-footer-main">
          <div className="landing-footer-brand"><Wordmark /><p>Different sides. Common ground.</p></div>
          <nav className="landing-footer-nav" aria-label="Footer navigation">
            {navigation.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
            <a href="/?demo=1">Explore the demo<ArrowUpRight className="size-4" aria-hidden="true" /></a>
          </nav>
        </div>
        <div className="landing-footer-bottom">
          <p>© {new Date().getFullYear()} Overlap</p>
          <Badge variant="ghost">Product preview</Badge>
          <div className="footer-control">
            <label htmlFor="landing-appearance">Appearance</label>
            <select id="landing-appearance" value={appearance} onChange={(event) => setAppearance(event.target.value as Appearance)}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  const { appearance, setAppearance } = useAppearance()
  return (
    <div className="landing-page font-sans">
      <a className="skip-link" href="#landing-content">Skip to main content</a>
      <LandingHeader appearance={appearance} setAppearance={setAppearance} />
      <main id="landing-content" tabIndex={-1}>
        <LandingHero />
        <ProductPrinciples />
        <HowItWorks />
        <WhyOverlap />
        <UseCases />
        <FrequentlyAskedQuestions />
        <LandingClosing />
      </main>
      <LandingFooter appearance={appearance} setAppearance={setAppearance} />
    </div>
  )
}
