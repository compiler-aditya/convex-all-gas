import { useAuthActions } from '@convex-dev/auth/react'
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

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
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
