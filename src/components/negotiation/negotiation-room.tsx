import { useEffect, useState } from 'react'
import { ArrowLeftRight, ChevronRight, LockKeyhole } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GapPanel } from './gap-panel'
import { OfferRecord } from './offer-record'
import { PrivatePositionPanel } from './private-position'
import { previewStates, room } from './fixtures'
import type { PreviewState } from './model'

const statusLabels: Record<PreviewState, string> = {
  waiting: 'Awaiting counterparty',
  negotiating: 'Negotiating',
  'hard-limit': 'Negotiating',
  settled: 'Settled',
}

const statusDescriptions: Record<PreviewState, string> = {
  waiting: 'Waiting for Devin to set their position.',
  negotiating: 'Your agent is considering the latest offer.',
  'hard-limit': 'Your fee floor is fixed. Other terms can still move.',
  settled: 'Both sides confirmed. Neither side’s limits were revealed.',
}

export function NegotiationRoom() {
  const [preview, setPreview] = useState<PreviewState>('negotiating')
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    document.documentElement.dataset.theme = appearance
    const themeColor = document.querySelector('meta[name="theme-color"]')
    themeColor?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--background').trim())
  }, [appearance])

  return (
    <div className="room-page font-sans">
      <a className="skip-link" href="#room-content">Skip to negotiation room</a>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="flex items-center gap-6">
            <a className="wordmark" href="/" aria-label="Overlap home">overlap<span aria-hidden="true">.</span></a>
            <Separator orientation="vertical" className="brand-divider" />
            <nav aria-label="Breadcrumb" className="room-breadcrumb">
              <span>Negotiation room</span>
              <ChevronRight className="size-3" aria-hidden="true" />
              <span className="font-mono tabular-nums">{room.id}</span>
            </nav>
          </div>
          <div className="viewer-label"><span>Viewing as</span><span className="text-foreground">Maya</span><span aria-hidden="true">/</span><span>Freelancer</span></div>
        </div>
      </header>

      <main className="room-main" id="room-content">
        <section className="room-intro" aria-labelledby="room-title">
          <div className="flex flex-col gap-2">
            <p className="section-label">Freelance contract</p>
            <h1 id="room-title" className="room-title text-balance">{room.title}</h1>
            <div className="room-participants">
              <span>Maya <span className="text-muted-foreground">/ freelancer</span></span>
              <ArrowLeftRight className="size-3 text-muted-foreground" aria-label="negotiating with" />
              <span>Devin <span className="text-muted-foreground">/ client</span></span>
              <span className="intro-description">{room.description}</span>
            </div>
          </div>
          <div className="room-status-block">
            <div className="flex items-center gap-3">
              <Badge variant="outline">{statusLabels[preview]}</Badge>
              <span className="round-counter font-mono tabular-nums">round {preview === 'waiting' ? '0' : '4'} of {room.maxRounds}</span>
            </div>
            <p className="room-status-description" role="status">{statusDescriptions[preview]}</p>
          </div>
        </section>

        <Tabs value={preview} onValueChange={(value) => setPreview(value as PreviewState)} className="room-state-tabs">
          <div className="preview-toolbar">
            <div className="preview-toolbar-controls">
              <span className="section-label preview-label" id="preview-label">Preview state</span>
              <TabsList variant="line" aria-labelledby="preview-label">
                {previewStates.map((state) => <TabsTrigger key={state.value} value={state.value}>{state.label}</TabsTrigger>)}
              </TabsList>
            </div>
            <span className="static-preview-label">Static data <span aria-hidden="true">·</span> nothing is sent</span>
          </div>
          {previewStates.map((state) => (
            <TabsContent value={state.value} key={state.value}>
              <div className="negotiation-board">
                <PrivatePositionPanel preview={state.value} />
                <OfferRecord preview={state.value} />
                <GapPanel preview={state.value} />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <footer className="room-footer">
          <p className="privacy-footer"><LockKeyhole className="size-3 shrink-0" aria-hidden="true" />Your limits never enter the shared record.</p>
          <div className="appearance-control">
            <label htmlFor="appearance">Appearance</label>
            <select id="appearance" value={appearance} onChange={(event) => setAppearance(event.target.value as 'light' | 'dark')}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </footer>
      </main>
    </div>
  )
}
