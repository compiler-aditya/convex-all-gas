import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { Blend } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Sign in for room creators only.
 *
 * The counterparty never sees this screen — they arrive on a join link and set
 * their limits without an account. Saying so here removes the objection a
 * visitor is most likely to have.
 */
export function SignIn() {
  const { signIn } = useAuthActions()
  const providers = useQuery(api.providers.available)
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      await signIn('password', {
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        flow,
      })
    } catch {
      // Deliberately vague: a precise message would let this form be used to
      // discover which addresses have accounts.
      setError(
        flow === 'signIn'
          ? 'Could not sign in. Check the email and password.'
          : 'Could not create that account. It may already exist.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    try {
      await signIn('google')
    } catch {
      setError('Could not continue with Google. Try again, or use a password.')
    }
  }

  return (
    <div className="min-h-dvh bg-background font-sans">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[420px] items-center px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-foreground"
          >
            <Blend className="size-5" strokeWidth={1.8} aria-hidden="true" />
            overlap
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[420px] px-6 pt-20">
        <h1 className="text-2xl font-semibold text-foreground">
          {flow === 'signIn' ? 'Sign in' : 'Create an account'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You only need an account to start a negotiation. The other side joins
          by link.
        </p>

        {providers?.google === true && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleGoogle()}
              className="mt-8 w-full"
            >
              <GoogleMark />
              Continue with Google
            </Button>

            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form
          onSubmit={handleSubmit}
          className={providers?.google === true ? 'grid gap-4' : 'mt-8 grid gap-4'}
        >
          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
            />
          </div>

          {error !== null && (
            <p role="alert" className="text-sm text-no-deal">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting
              ? 'Working…'
              : flow === 'signIn'
                ? 'Sign in'
                : 'Create account'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
            setError(null)
          }}
          className="mt-5 text-sm text-muted-foreground underline underline-offset-4"
        >
          {flow === 'signIn'
            ? 'No account? Create one'
            : 'Already have an account? Sign in'}
        </button>
      </main>
    </div>
  )
}

/** Google's mark, drawn inline so no third-party asset is fetched. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}
