import { useCallback, useEffect, useMemo } from "react"
import { useUsers } from "@/features/users/users-provider"
import { useAuth } from "@/lib/auth-context"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

export function useUsersSettings() {
  const { role, profile } = useAuth()
  const {
    state: { users, roles, isLoading },
    actions: { loadUsers, changeRole },
  } = useUsers()
  const { currentWorkspaceId } = useWorkspace()
  const { toast } = useFeedback()
  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const workspaceUsers = useMemo(() => {
    return currentWorkspaceId
      ? users.filter((user) => user.workspaceIds.includes(currentWorkspaceId))
      : users
  }, [currentWorkspaceId, users])

  const updateRole = useCallback(async (userId: string, roleId: string) => {
    try {
      await changeRole(userId, roleId)
      toast({ title: "Role updated", variant: "success" })
    } catch (error) {
      toast({
        title: "Could not update role",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    }
  }, [changeRole, toast])

  return {
    actions: { updateRole },
    meta: { users: workspaceUsers, roles, isLoading, canManage: role?.can_manage_roles === true, currentUserId: profile?.id },
  }
}
