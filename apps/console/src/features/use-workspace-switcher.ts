import type { MouseEvent } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { useSidebar } from "@moc/ui/components/navigation/sidebar"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

export function useWorkspaceSwitcher() {
  const { state: sidebarState } = useSidebar()
  const { workspaces, currentWorkspace, currentWorkspaceId, setCurrentWorkspaceId } = useWorkspace()
  const { toast } = useFeedback()

  function selectWorkspace(event: MouseEvent<HTMLDivElement>) {
    const workspaceId = event.currentTarget.dataset.workspaceId
    const workspace = workspaces.find((item) => item.id === workspaceId)
    if (!workspace || workspace.id === currentWorkspaceId) return

    setCurrentWorkspaceId(workspace.id)
    toast({ title: "Workspace switched", description: `Now viewing ${workspace.name}.`, variant: "success" })
  }

  return {
    actions: { selectWorkspace },
    meta: { workspaces, currentWorkspaceId, workspaceName: currentWorkspace?.name ?? "MOC Console", isCollapsed: sidebarState.isCollapsed },
  }
}
