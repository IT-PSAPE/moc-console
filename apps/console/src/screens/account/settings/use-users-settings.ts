import { useCallback, useEffect } from "react"
import { useUsers } from "@/features/users/users-provider"
import { useAuth } from "@/lib/auth-context"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

export function useUsersSettings() {
  const { profile } = useAuth()
  const {
    state: { users, pendingUsers, roles, isLoading },
    actions: { loadUsers, changeRole, approveUser },
  } = useUsers()
  const { role } = useWorkspace()
  const { toast } = useFeedback()
  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

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

  const approve = useCallback(async (requestId: string) => {
    try {
      await approveUser(requestId)
      toast({ title: "Member approved", variant: "success" })
    } catch (error) {
      toast({
        title: "Could not approve member",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    }
  }, [approveUser, toast])

  return {
    actions: { approve, updateRole },
    meta: { users, pendingUsers, roles, isLoading, canManage: role?.can_manage_roles === true, currentUserId: profile?.id },
  }
}
