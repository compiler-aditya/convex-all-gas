import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { LandingPage } from '../components/landing/landing-page'

/**
 * The landing page, with session awareness added from outside.
 *
 * `LandingPage` itself takes no Convex dependency — it is rendered without a
 * provider by the fixtures harness and by its own test — so the session is
 * resolved here and handed down as a plain prop.
 *
 * `useConvexAuth` rather than the `<Authenticated>` / `<Unauthenticated>`
 * components: those would mount the whole page twice and remount it when the
 * session resolves, which is a visible flash on a page this long.
 */
export function LandingRoute() {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : 'skip')

  if (!isAuthenticated) return <LandingPage />

  return (
    <LandingPage
      account={{
        // Undefined until the query lands; the header falls back to a plain
        // "Signed in" rather than flashing an empty identity.
        email: viewer?.email,
        onSignOut: () => void signOut(),
      }}
    />
  )
}
