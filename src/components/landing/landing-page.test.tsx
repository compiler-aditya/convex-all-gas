// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { nextAppearance, parseAppearance } from '@/hooks/use-appearance'
import { LandingPage } from './landing-page'
import { NegotiationPreview } from './negotiation-preview'
import { exampleSteps, nextExampleStep, questions } from './landing-content'
import { PublicExperience } from './public-experience'

const page = () => renderToStaticMarkup(<LandingPage />)

function textContent(markup: string) {
  return markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

describe('public landing page', () => {
  it('opens the landing experience rather than the room at the public entry', () => {
    const html = renderToStaticMarkup(<PublicExperience showDemo={false} />)
    expect(html).toContain('id="landing-title"')
    expect(html).not.toContain('id="room-title"')
    expect(html).not.toContain('id="demo-scenario"')
  })

  it('has one primary heading and accessible page landmarks', () => {
    const html = page()
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('id="landing-title"')
    expect(html).toContain('Different sides.')
    expect(html).toContain('Common ground.')
    expect(html).toContain('<header')
    expect(html).toContain('<main id="landing-content"')
    expect(html).toContain('<footer')
    expect(html).toContain('Skip to main content')
  })

  it('uses native demo links and real section destinations', () => {
    const html = page()
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1])
    expect(links.filter((href) => href === '/?demo=1').length).toBeGreaterThanOrEqual(4)
    for (const href of links) {
      if (href.startsWith('#')) {
        expect(href).not.toBe('#')
        expect(html).toContain(`id="${href.slice(1)}"`)
      } else {
        expect(['/', '/?demo=1']).toContain(href)
      }
    }
    expect(html).not.toContain('role="button" href=')
  })

  it('labels fictional examples and never presents a signup form', () => {
    const text = textContent(page())
    expect(text).toContain('An interactive preview. No sign-up required.')
    expect(text).toContain('Example · not live')
    expect(text).toContain('Sample data. No AI runs and nothing is sent.')
    expect(text).toContain('It does not run AI, invite anyone, send proposals, or save your negotiation inputs.')
    expect(page()).not.toContain('<form')
  })

  it('provides keyboard-accessible FAQ controls with unique identifiers', () => {
    const html = page()
    for (const item of questions) {
      expect(html).toContain(`id="faq-${item.id}"`)
      expect(html).toContain(item.question)
    }
    expect(html).toContain('aria-expanded="true"')
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps mobile navigation closed and connected to its toggle initially', () => {
    const html = page()
    expect(html).toContain('aria-controls="landing-mobile-navigation"')
    expect(html).toContain('aria-label="Open navigation"')
    expect(html).toMatch(/<nav[^>]*id="landing-mobile-navigation"[^>]*hidden/)
  })

  it('loads the editorial image lazily with intrinsic dimensions and meaningful alt text', () => {
    const html = page()
    expect(html).toMatch(/<img[^>]*src="\/images\/common-ground\.webp"/)
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
    expect(html).toContain('width="1024" height="1024"')
    expect(html).toContain('alt="Two green chairs')
  })
})

describe('illustrative walkthrough', () => {
  it('starts with the private brief and no invented confirmations', () => {
    const html = renderToStaticMarkup(<NegotiationPreview />)
    expect(html).toContain('Maya')
    expect(textContent(html)).toContain('Your limits and priorities stay with your agent.')
    expect(html).toContain('Next: compare proposals')
    expect(html).not.toContain('Maya confirmed')
    expect(html).not.toContain('Devin confirmed')
    expect(html).toContain('aria-current="step"')
    expect(html).toContain('aria-live="polite"')
  })

  it('advances predictably and replays without a network or storage operation', () => {
    expect(exampleSteps.map((step) => step.id)).toEqual(['brief', 'proposals', 'agreement'])
    expect([nextExampleStep(0), nextExampleStep(1), nextExampleStep(2)]).toEqual([1, 2, 0])
  })
})

describe('shared appearance preference', () => {
  it('only accepts supported appearance values', () => {
    expect(parseAppearance('light')).toBe('light')
    expect(parseAppearance('dark')).toBe('dark')
    for (const value of [undefined, null, '', 'system', 'unexpected']) expect(parseAppearance(value)).toBe('system')
  })

  it('cycles through all three choices without trapping system mode', () => {
    expect(nextAppearance('system')).toBe('light')
    expect(nextAppearance('light')).toBe('dark')
    expect(nextAppearance('dark')).toBe('system')
  })
})
