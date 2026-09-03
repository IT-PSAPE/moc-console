import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Page } from "@moc/ui/components/layout/page"
import { RadioTower } from "lucide-react"

export function HomeScreen() {
  return (
    <Page>
      <Page.Content className="flex min-h-dvh items-center justify-center">
        <EmptyState
          icon={<RadioTower />}
          title="Open a broadcast link"
          description="This player loads a published broadcast playlist from its public URL."
        />
      </Page.Content>
    </Page>
  )
}
