import { Send } from "lucide-react"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"

export function MiniAppUnavailableView() {
  return (
    <EmptyState
      icon={<Send />}
      headingLevel="h1"
      title="Open this from Telegram"
      description="This page only works inside the Telegram app. Tap the button or link from your Telegram message to open it there."
    />
  )
}
