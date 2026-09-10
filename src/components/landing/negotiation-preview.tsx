import { useState } from 'react'
import { ArrowRight, ArrowRightLeft, Blend, Check, LockKeyhole, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { exampleSteps, nextExampleStep } from './landing-content'

function PrivateBriefExample() {
  return (
    <div className="landing-example-body">
      <div className="landing-example-identity">
        <span className="landing-person-initial" aria-hidden="true">M</span>
        <div><p>Maya&apos;s private brief</p><span>Freelancer · Product website build</span></div>
        <LockKeyhole className="size-4" aria-label="Private" />
      </div>
      <dl className="landing-example-terms">
        <div><dt>Target project fee</dt><dd>₹1,25,000</dd></div>
        <div><dt>Delivery window</dt><dd>32 days</dd></div>
        <div><dt>Project scope</dt><dd>4 screens</dd></div>
      </dl>
      <p className="landing-example-note"><LockKeyhole className="size-4" aria-hidden="true" />Your limits and priorities stay with your agent.</p>
    </div>
  )
}

function PublicProposalsExample() {
  return (
    <div className="landing-example-body">
      <table className="landing-example-comparison">
        <caption className="sr-only">Illustrative public proposals from Maya and Devin</caption>
        <thead><tr><th scope="col">Term</th><th scope="col">Maya</th><th scope="col">Devin</th></tr></thead>
        <tbody>
          <tr><th scope="row">Project fee</th><td>₹1,25,000</td><td>₹1,15,000</td></tr>
          <tr><th scope="row">Delivery</th><td>32 days</td><td>30 days</td></tr>
          <tr><th scope="row">Scope</th><td>4 screens</td><td>4 screens</td></tr>
          <tr><th scope="row">Upfront</th><td>40%</td><td>40%</td></tr>
        </tbody>
      </table>
      <p className="landing-example-note"><ArrowRightLeft className="size-4" aria-hidden="true" />Fee and delivery are still being worked through.</p>
    </div>
  )
}

function AgreementExample() {
  return (
    <div className="landing-example-body">
      <dl className="landing-example-terms">
        <div><dt>Project fee</dt><dd>₹1,25,000</dd></div>
        <div><dt>Delivery</dt><dd>32 days</dd></div>
        <div><dt>Scope & revisions</dt><dd>4 screens · 3 rounds</dd></div>
        <div><dt>Upfront payment</dt><dd>40%</dd></div>
      </dl>
      <div className="landing-example-confirmations">
        <span><Check className="size-4" aria-hidden="true" />Maya confirmed</span>
        <span><Check className="size-4" aria-hidden="true" />Devin confirmed</span>
      </div>
    </div>
  )
}

export function NegotiationPreview() {
  const [step, setStep] = useState(0)
  const current = exampleSteps[step]

  return (
    <div className="landing-process-layout">
      <ol className="landing-process-steps" aria-label="How an Overlap negotiation works">
        {exampleSteps.map((item, index) => (
          <li key={item.id} aria-current={index === step ? 'step' : undefined}>
            <span className="landing-step-number" aria-hidden="true">0{index + 1}</span>
            <div className="landing-step-copy">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="landing-example-wrap">
        <div className="landing-example-eyebrow"><span>TAKE A QUICK WALKTHROUGH</span><span>Example · not live</span></div>
        <Card className="landing-example-card">
          <CardHeader>
            <div className="landing-example-card-top">
              <span className="landing-example-agent"><Blend className="size-5" aria-hidden="true" />Your agent</span>
              <Badge variant={step === 2 ? 'default' : 'outline'}>{step === 0 ? 'Private brief' : step === 1 ? 'Public proposals' : 'Both confirmed'}</Badge>
            </div>
            <CardTitle><h3 id="landing-example-title">{current.cardTitle}</h3></CardTitle>
            <CardDescription>{current.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 0 ? <PrivateBriefExample /> : step === 1 ? <PublicProposalsExample /> : <AgreementExample />}
          </CardContent>
          <CardFooter>
            <div className="landing-example-actions">
              <p aria-live="polite" aria-atomic="true" className="landing-example-step">Step {step + 1} of 3<span className="sr-only">: {current.title}</span></p>
              <Button variant="outline" onClick={() => setStep(nextExampleStep)}>
                {current.action}
                {step === 2 ? <RotateCcw data-icon="inline-end" aria-hidden="true" /> : <ArrowRight data-icon="inline-end" aria-hidden="true" />}
              </Button>
            </div>
          </CardFooter>
        </Card>
        <p className="landing-example-disclaimer">Sample data. No AI runs and nothing is sent.</p>
      </div>
    </div>
  )
}
