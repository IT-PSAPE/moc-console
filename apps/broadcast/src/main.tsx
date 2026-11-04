import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { StrictMode } from "react"
import { IconoirProvider } from "iconoir-react"
import { createRoot } from "react-dom/client"
import "@moc/ui/styles.css"
import App from "@/App"
import { OverlayProvider } from "@moc/ui/components/overlays/overlay-provider"
import { FeedbackProvider } from "@moc/ui/components/feedback/feedback-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IconoirProvider iconProps={{ width: 24, height: 24, strokeWidth: 1.75, 'aria-hidden': true }}>
      <QueryClientProvider client={queryClient}>
        <OverlayProvider>
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </OverlayProvider>
      </QueryClientProvider>
    </IconoirProvider>
  </StrictMode>,
)
