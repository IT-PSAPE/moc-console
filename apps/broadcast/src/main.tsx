import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@moc/ui/styles.css'
import App from '@/App.tsx'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import { FeedbackProvider } from '@moc/ui/components/feedback/feedback-provider'

// MOC Broadcast is a single, always-dark surface (it's a display/player
// app). The @moc/ui token system toggles dark via [data-theme] at the
// document root, so set it once here rather than per-screen.
document.documentElement.dataset.theme = 'dark'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </OverlayProvider>
  </StrictMode>,
)
