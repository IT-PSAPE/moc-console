import type { MouseEvent } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { useSidebar } from "@moc/ui/components/navigation/sidebar"

export function useWorkspaceSwitcher() {
  const { state: sidebarState } = useSidebar()
  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId } = useWorkspace()
  const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId)

  function selectWorkspace(event: MouseEvent<HTMLDivElement>) {
    const workspaceId = event.currentTarget.dataset.workspaceId
    if (workspaceId && workspaceId !== currentWorkspaceId) setCurrentWorkspaceId(workspaceId)
  }

  return {
    actions: { selectWorkspace },
    meta: { workspaces, currentWorkspaceId, workspaceName: currentWorkspace?.name ?? "MOC Console", isCollapsed: sidebarState.isCollapsed },
  }
}
