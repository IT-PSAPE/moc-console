import { useCallback, useEffect, useMemo, useState } from "react"
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
  const [search, setSearch] = useState("")

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const workspaceUsers = currentWorkspaceId
      ? users.filter((user) => user.workspaceIds.includes(currentWorkspaceId))
      : users
    const query = search.trim().toLowerCase()
    if (!query) return workspaceUsers
    return workspaceUsers.filter((user) =>
      user.name.toLowerCase().includes(query)
      || user.surname.toLowerCase().includes(query)
      || user.email.toLowerCase().includes(query)
      || (user.role?.name ?? "").toLowerCase().includes(query),
    )
  }, [currentWorkspaceId, search, users])

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
    state: { search },
    actions: { setSearch, updateRole },
    meta: { users: filteredUsers, roles, isLoading, canManage: role?.can_manage_roles === true, currentUserId: profile?.id },
  }
}
