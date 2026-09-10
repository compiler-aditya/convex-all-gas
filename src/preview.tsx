import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicExperience } from './components/landing/public-experience'
import './index.css'

const showDemo = new URLSearchParams(window.location.search).get('demo') === '1'
document.title = showDemo ? 'Negotiation demo — Overlap' : 'Overlap — Different sides. Common ground.'

// The static preview deliberately does not initialize Convex or authentication.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicExperience showDemo={showDemo} />
  </StrictMode>,
)
