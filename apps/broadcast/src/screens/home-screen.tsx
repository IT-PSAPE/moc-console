import { BroadcastLayout } from "@/features/broadcast-layout"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { RadioTower } from "lucide-react"

export function HomeScreen() {
  return (
    <BroadcastLayout>
      <EmptyState
        headingLevel="h1"
        icon={<RadioTower />}
        title="Open a broadcast link"
        description="This player loads a public broadcast playlist from its own URL."
      />
    </BroadcastLayout>
  )
}
