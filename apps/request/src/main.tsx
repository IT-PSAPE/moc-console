import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@moc/ui/styles.css'
import App from '@/App.tsx'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import { FeedbackProvider } from '@moc/ui/components/feedback/feedback-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <OverlayProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </OverlayProvider>
    </QueryClientProvider>
  </StrictMode>,
)
