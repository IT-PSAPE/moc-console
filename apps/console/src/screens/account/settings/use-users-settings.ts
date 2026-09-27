import { useCallback, useEffect, useState } from "react"
import type { PendingWorkspaceUser } from "@/data/fetch-users"
import { useUsers } from "@/features/users/users-provider"
import { useAuth } from "@/lib/auth-context"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

export function useUsersSettings() {
  const { profile } = useAuth()
  const {
    state: { users, pendingUsers, roles, isLoading },
    actions: { loadUsers, changeRole, approveUser, rejectUser },
  } = useUsers()
  const { role } = useWorkspace()
  const { toast } = useFeedback()
  const [rejectTarget, setRejectTarget] = useState<PendingWorkspaceUser | null>(null)
  const [isRejecting, setIsRejecting] = useState(false)
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

  const requestReject = useCallback((requestId: string) => {
    setRejectTarget(pendingUsers.find((user) => user.requestId === requestId) ?? null)
  }, [pendingUsers])

  const handleRejectOpenChange = useCallback((open: boolean) => {
    if (!open && !isRejecting) setRejectTarget(null)
  }, [isRejecting])

  const confirmReject = useCallback(async () => {
    if (!rejectTarget) return
    setIsRejecting(true)
    try {
      await rejectUser(rejectTarget.requestId)
      setRejectTarget(null)
      toast({ title: "Request rejected", variant: "success" })
    } catch (error) {
      toast({
        title: "Could not reject request",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsRejecting(false)
    }
  }, [rejectTarget, rejectUser, toast])

  const rejectName = rejectTarget ? `${rejectTarget.name} ${rejectTarget.surname}`.trim() : ""
  const rejectDescription = `${rejectName || "This person"} will not be added to this workspace.`

  return {
    actions: { approve, updateRole, requestReject, handleRejectOpenChange, confirmReject },
    meta: { users, pendingUsers, roles, isLoading, rejectTarget, rejectDescription, isRejecting, canManage: role?.can_manage_roles === true, currentUserId: profile?.id },
  }
}
