import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App.tsx'
import { OverlayProvider } from '@/components/overlays/overlay-provider'
import { FeedbackProvider } from '@/components/feedback/feedback-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </OverlayProvider>
  </StrictMode>,
)
