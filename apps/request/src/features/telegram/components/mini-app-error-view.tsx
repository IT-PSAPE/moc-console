import { AlertTriangle } from "lucide-react"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Button } from "@moc/ui/components/controls/button"
import { MINI_APP_ERROR_COPY } from "@/features/telegram/mini-app-error-copy"
import type { MiniAppErrorCode } from "@moc/notifications"

type MiniAppErrorViewProps = {
  code: MiniAppErrorCode
  message: string
  onRetry: () => void
}

export function MiniAppErrorView({ code, message, onRetry }: MiniAppErrorViewProps) {
  const copy = code === "invalid" ? { title: "Something went wrong", description: message } : MINI_APP_ERROR_COPY[code] ?? { title: "Something went wrong", description: message }
  const canRetry = code !== "not_linked" && code !== "forbidden"

  return (
    <EmptyState
      icon={<AlertTriangle />}
      headingLevel="h1"
      title={copy.title}
      description={copy.description}
      action={canRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : undefined}
    />
  )
}
