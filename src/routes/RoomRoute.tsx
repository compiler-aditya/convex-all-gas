import { useParams, useSearchParams } from 'react-router-dom'
import type { Id } from '../../convex/_generated/dataModel'
import { NegotiationRoom } from '../components/negotiation/negotiation-room'
import { RoomProvider } from '../components/negotiation/room-context'
import { useLiveRoom } from '../lib/live-room'

/**
 * The negotiation room, on live data.
 *
 * The counterparty has no account: they arrive at /room/:roomId?t=<token> and
 * that token authenticates every query and mutation they make. It is read once
 * here and threaded through, never persisted.
 */
export function RoomRoute() {
  const { roomId } = useParams<{ roomId: string }>()
  const [search] = useSearchParams()
  const joinToken = search.get('t') ?? undefined

  const live = useLiveRoom((roomId ?? null) as Id<'rooms'> | null, joinToken)

  if (live.state === 'loading') {
    return (
      <Shell>
        <p className="text-muted-foreground text-sm">Opening the room…</p>
      </Shell>
    )
  }

  if (live.state === 'denied') {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">This room is not open to you</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Negotiations are visible only to their two participants. If you were
          sent a link, open that link rather than this page.
        </p>
      </Shell>
    )
  }

  if (live.state === 'setup') {
    return (
      <Shell>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          {live.title}
        </p>
        <h1 className="mt-2 text-xl font-semibold">Set your position</h1>
        <p className="text-muted-foreground mt-2 text-sm">{live.reason}</p>
        <a
          href={`/room/${roomId}/position${joinToken !== undefined ? `?t=${joinToken}` : ''}`}
          className="mt-4 inline-block rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
        >
          Set your limits
        </a>
      </Shell>
    )
  }

  if (live.state === 'no-deal') {
    return (
      <Shell>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          {live.title}
        </p>
        <h1 className="mt-2 text-xl font-semibold">
          No agreement is possible on{' '}
          <span className="text-no-deal">{live.dimension}</span>.
        </h1>
        {/* The dimension, never the distance. Saying how far apart they were
            would disclose the limit the whole product protects. */}
        <p className="text-muted-foreground mt-2 text-sm">
          Neither side’s limits were revealed. You can start again with
          different limits if your position has changed.
        </p>
      </Shell>
    )
  }

  return (
    <RoomProvider value={live.data}>
      <NegotiationRoom />
    </RoomProvider>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-24">{children}</main>
  )
}
