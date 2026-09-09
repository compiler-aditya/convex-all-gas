import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { SignIn } from './components/SignIn'

/**
 * Shell for the authenticated area.
 *
 * Deliberately plain: the design pass happens in v0 and lands on the room
 * screen, which is the one that carries the demo.
 */
function Dashboard() {
  const { signOut } = useAuthActions()
  const rooms = useQuery(api.rooms.myRooms)

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            Overlap
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Your negotiations
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-neutral-600 underline underline-offset-4 dark:text-neutral-400"
        >
          Sign out
        </button>
      </header>

      <section className="mt-8">
        {rooms === undefined ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : rooms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
            <p className="text-neutral-700 dark:text-neutral-300">
              No negotiations yet.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Create one, set your private limits, and send the link to the
              person you are already dealing with.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {rooms.map((room) => (
              <li
                key={room.roomId}
                className="flex items-center justify-between py-3"
              >
                <span className="text-neutral-900 dark:text-neutral-100">
                  {room.title}
                </span>
                <span className="font-mono text-xs text-neutral-500">
                  {room.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function App() {
  return (
    <main className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <AuthLoading>
        <div className="grid min-h-screen place-items-center">
          <p className="text-sm text-neutral-500">Checking your session…</p>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="grid min-h-screen place-items-center p-6">
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <Dashboard />
      </Authenticated>
    </main>
  )
}
