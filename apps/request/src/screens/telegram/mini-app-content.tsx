import { Spinner } from "@moc/ui/components/feedback/spinner"
import { MiniAppUnavailableView } from "@/features/telegram/components/mini-app-unavailable-view"
import { MiniAppErrorView } from "@/features/telegram/components/mini-app-error-view"
import { MiniAppNoTargetView } from "@/features/telegram/components/mini-app-no-target-view"
import { useMiniAppContext } from "@/features/telegram/mini-app-context"
import { useMiniAppView } from "@/features/telegram/use-mini-app-view"
import { EntityDetailScreen } from "@/screens/telegram/entity-detail-screen"
import { ChecklistScreen } from "@/screens/telegram/checklist-screen"

export function MiniAppContent() {
  const { actions } = useMiniAppContext()
  const view = useMiniAppView()

  switch (view.kind) {
    case "unavailable":
      return <MiniAppUnavailableView />
    case "no_target":
      return <MiniAppNoTargetView />
    case "loading":
      return (
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      )
    case "error":
      return <MiniAppErrorView code={view.code} message={view.message} onRetry={actions.reload} />
    case "checklist":
      return <ChecklistScreen detail={view.detail} />
    case "entity":
      return <EntityDetailScreen detail={view.detail} autoStartScan={view.autoStartScan} />
    case "empty":
      return null
  }
}
