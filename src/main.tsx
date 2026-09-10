import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App.tsx'
import { BoundsRoute } from './routes/BoundsRoute'
import { CreateRoomRoute } from './routes/CreateRoomRoute'
import { RoomRoute } from './routes/RoomRoute'
import './index.css'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
if (!convexUrl) {
  throw new Error(
    'VITE_CONVEX_URL is not set. Run `npx convex dev` to write .env.local.',
  )
}

const convex = new ConvexReactClient(convexUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ConvexAuthProvider, not ConvexProvider — the plain one never sends tokens. */}
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <Routes>
          {/* The room is reachable without an account: the counterparty is
              authenticated by the token on the link, not by a session. */}
          <Route path="/rooms/new" element={<CreateRoomRoute />} />
          <Route path="/room/:roomId/position" element={<BoundsRoute />} />
          <Route path="/room/:roomId" element={<RoomRoute />} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ConvexAuthProvider>
  </StrictMode>,
)
