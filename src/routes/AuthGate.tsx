import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import type { ReactNode } from 'react'
import { SignIn } from '../components/SignIn'

/**
 * Gates the screens that need an account.
 *
 * Only room creation needs one. The landing page and the negotiation room stay
 * open — the counterparty is authenticated by their link, not by a session.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="grid min-h-dvh place-items-center bg-background">
          <p className="text-sm text-muted-foreground">Checking your session…</p>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  )
}
