import { Drawer } from "iconoir-react"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"

export function MiniAppNoTargetView() {
  return (
    <EmptyState
      icon={<Drawer />}
      headingLevel="h1"
      title="Nothing to open"
      description="Tap View on a MOC message in Telegram to see its details here."
    />
  )
}
