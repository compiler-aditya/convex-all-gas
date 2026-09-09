import { useAuthActions } from '@convex-dev/auth/react'
import { useState } from 'react'

/**
 * Sign in for room creators only.
 *
 * The counterparty never sees this screen — they arrive on a join link and set
 * their bounds without an account. Keeping registration off that path is what
 * makes a two-sided negotiation reachable at all.
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
      // Convex Auth returns deliberately vague errors so this form cannot be
      // used to discover which addresses have accounts. Keep it vague here too.
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
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        {flow === 'signIn' ? 'Sign in' : 'Create an account'}
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        You only need an account to start a negotiation. The other side joins by
        link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <label className="block">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-400"
          />
        </label>

        <label className="block">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={
              flow === 'signIn' ? 'current-password' : 'new-password'
            }
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-400"
          />
        </label>

        {error !== null && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {submitting
            ? 'Working…'
            : flow === 'signIn'
              ? 'Sign in'
              : 'Create account'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
          setError(null)
        }}
        className="mt-4 text-sm text-neutral-600 underline underline-offset-4 dark:text-neutral-400"
      >
        {flow === 'signIn'
          ? 'No account? Create one'
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
