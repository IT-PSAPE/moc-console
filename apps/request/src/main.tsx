import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@moc/ui/styles.css'
import App from '@/App.tsx'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import { FeedbackProvider } from '@moc/ui/components/feedback/feedback-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </OverlayProvider>
  </StrictMode>,
)
