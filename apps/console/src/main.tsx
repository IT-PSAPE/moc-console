import './lib/oauth-interceptors'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@moc/ui/styles.css'
import './app.css'
import App from '@/App.tsx'
import { AuthProvider } from '@/lib/auth-context'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import { FeedbackProvider } from '@moc/ui/components/feedback/feedback-provider'
import { ConnectivityMonitor } from '@/lib/connectivity-monitor'
import { removeLegacyServiceWorker } from '@/lib/remove-legacy-service-worker'

void removeLegacyServiceWorker().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OverlayProvider>
        <FeedbackProvider>
          <ConnectivityMonitor />
          <App />
        </FeedbackProvider>
      </OverlayProvider>
    </AuthProvider>
  </StrictMode>,
)
