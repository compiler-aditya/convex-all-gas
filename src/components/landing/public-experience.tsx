import { Component, lazy, Suspense, type ReactNode } from 'react'
import { Blend } from 'lucide-react'
import { LandingPage } from './landing-page'

const NegotiationRoom = lazy(() => import('../negotiation/negotiation-room').then((module) => ({ default: module.NegotiationRoom })))

function DemoLoading() {
  return (
    <main className="landing-demo-loading font-sans" aria-busy="true">
      <Blend className="size-8" aria-hidden="true" />
      <h1>Opening the demo</h1>
      <p role="status">Getting the example negotiation ready.</p>
      <a href="/">Back to Overlap</a>
    </main>
  )
}

class DemoBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="landing-demo-loading font-sans">
          <Blend className="size-8" aria-hidden="true" />
          <h1>The demo couldn&apos;t load.</h1>
          <p>Please try opening it again.</p>
          <a href="/?demo=1">Reload the demo</a>
          <a href="/">Back to Overlap</a>
        </main>
      )
    }
    return this.props.children
  }
}

export function PublicExperience({ showDemo }: { showDemo: boolean }) {
  return showDemo
    ? <DemoBoundary><Suspense fallback={<DemoLoading />}><NegotiationRoom /></Suspense></DemoBoundary>
    : <LandingPage />
}
