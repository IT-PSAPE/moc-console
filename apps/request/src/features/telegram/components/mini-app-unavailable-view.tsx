import { PaperPlaneRight as SendDiagonal } from '@phosphor-icons/react'
import { EmptyState } from "@moc/ui/components/feedback/empty-state"

export function MiniAppUnavailableView() {
  return (
    <EmptyState
      icon={<SendDiagonal />}
      headingLevel="h1"
      title="Open this from Telegram"
      description="This page only works inside the Telegram app. Tap the button or link from your Telegram message to open it there."
    />
  )
}
