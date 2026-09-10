import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NegotiationRoom } from './components/negotiation/negotiation-room'
import './index.css'

// The static preview deliberately does not initialize Convex or authentication.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NegotiationRoom />
  </StrictMode>,
)
