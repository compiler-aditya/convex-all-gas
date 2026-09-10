import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../convex/_generated/api'

/**
 * Shell for the authenticated area.
 *
 * Deliberately plain: the design pass happens in v0 and lands on the room
 * screen, which is the one that carries the demo.
 */
export function Dashboard() {
  const { signOut } = useAuthActions()
  const rooms = useQuery(api.rooms.myRooms)

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Overlap
          </h1>
          <p className="text-sm text-muted-foreground">
            Your negotiations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/rooms/new"
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            New negotiation
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mt-8">
        {rooms === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rooms.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="text-foreground">
              No negotiations yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one, set your private limits, and send the link to the
              person you are already dealing with.
            </p>
            <Link
              to="/rooms/new"
              className="mt-4 inline-block rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
            >
              New negotiation
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rooms.map((room) => (
              <li key={room.roomId}>
                <Link
                  to={`/room/${room.roomId}`}
                  className="flex items-center justify-between py-3 text-foreground"
                >
                  <span>{room.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {room.status.replace(/_/g, ' ')}
                  </span>
                </Link>
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
    <div className="min-h-dvh bg-background">
      <Dashboard />
    </div>
  )
}
