import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App.tsx'
import { AuthProvider } from '@/lib/auth-context'
import { OverlayProvider } from '@/components/overlays/overlay-provider'
import { FeedbackProvider } from '@/components/feedback/feedback-provider'
import { ServiceWorkerRegistrar } from '@/lib/service-worker'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OverlayProvider>
        <FeedbackProvider>
          <ServiceWorkerRegistrar />
          <App />
        </FeedbackProvider>
      </OverlayProvider>
    </AuthProvider>
  </StrictMode>,
)
