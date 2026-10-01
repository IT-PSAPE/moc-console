import { useAuth } from "@/lib/auth-context"
import type { MouseEvent } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { useSidebar } from "@moc/ui/components/navigation/sidebar"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

export function useWorkspaceSwitcher() {
  const { profile, user } = useAuth()
  const displayName = profile ? `${profile.name} ${profile.surname}`.trim() : user?.email ?? "Your account"
  const initials = profile ? `${profile.name[0] ?? ""}${profile.surname[0] ?? ""}` : (user?.email?.[0] ?? "?").toUpperCase()
  const { state: sidebarState } = useSidebar()
  const { workspaces, currentWorkspace, currentWorkspaceId, setCurrentWorkspaceId, role } = useWorkspace()
  const firstName = profile?.name.trim().split(/\s+/)[0] || displayName
  const roleName = role?.name ? role.name[0].toUpperCase() + role.name.slice(1).toLowerCase() : ""
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
    meta: { displayName, firstName, roleName, initials, avatarUrl: profile?.avatarUrl ?? "", email: user?.email ?? "", workspaces: workspaces.map(workspace => ({ ...workspace, initials: workspace.name.slice(0, 1).toUpperCase() })), currentWorkspaceId, workspaceName: currentWorkspace?.name ?? "MOC Console", isCollapsed: sidebarState.isCollapsed },
  }
}
