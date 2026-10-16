import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import type { PendingWorkspaceUser, UserWithRole } from "@/data/fetch-users"
import { useUsers } from "@/features/users/users-provider"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useQueryText } from '@/hooks/use-query-text'
import { mutateScheduledMessage } from '@/features/scheduled-messages/services/scheduled-message-service'

export function useMembersScreen() {
  const {
    state: { users, pendingUsers, roles, isLoading, isInitialLoading },
    actions: { loadUsers, changeRole, approveUser, rejectUser },
  } = useUsers()
  const { role, currentWorkspaceId } = useWorkspace()
  const canManage = role?.can_manage_roles === true
  const [search, setSearch] = useQueryText()
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [loadErrorWorkspaceId, setLoadErrorWorkspaceId] = useState<string | null>(null)
  const currentLoadError = loadErrorWorkspaceId === currentWorkspaceId ? loadError : null
  const normalizedSearch = search.trim().toLowerCase()
  const visibleUsers = users.filter(matchesSearch)

  function matchesSearch(user: UserWithRole): boolean {
    return `${user.name} ${user.surname} ${user.email} ${user.role?.name ?? ""}`.toLowerCase().includes(normalizedSearch)
  }

  function changeSearch(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value)
  }
  const { toast } = useFeedback()
  const [rejectTarget, setRejectTarget] = useState<PendingWorkspaceUser | null>(null)
  const [isRejecting, setIsRejecting] = useState(false)
  const handleLoadError = useCallback((reason: unknown): void => {
    setLoadErrorWorkspaceId(currentWorkspaceId)
    setLoadError(reason instanceof Error ? reason : new Error("Couldn't load members"))
  }, [currentWorkspaceId])
  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    setLoadErrorWorkspaceId(currentWorkspaceId)
    void loadUsers().catch((reason: unknown) => {
      if (!cancelled) handleLoadError(reason)
    })
    return () => { cancelled = true }
  }, [currentWorkspaceId, handleLoadError, loadUsers])

  async function retryLoad(): Promise<void> {
    setLoadError(null)
    await loadUsers().catch(handleLoadError)
  }

  const updateRole = useCallback(async (userId: string, roleId: string) => {
    try {
      await changeRole(userId, roleId)
      toast({ title: "Role updated", variant: "success" })
      if(currentWorkspaceId) {
        try {await mutateScheduledMessage(currentWorkspaceId,'commands.sync',{})}
        catch {toast({title:'Telegram command menus will refresh on the daily run',variant:'error'})}
      }
    } catch (error) {
      toast({
        title: "Could not update role",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    }
  }, [changeRole, toast, currentWorkspaceId])

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
    actions: { changeSearch, retryLoad, approve, updateRole, requestReject, handleRejectOpenChange, confirmReject },
    state: { search, loadError: currentLoadError },
    meta: { isFiltered: normalizedSearch.length > 0, users: visibleUsers, totalUsers: users.length, pendingUsers, roles, isLoading, rejectTarget, rejectDescription, isRejecting, canManage, isInitialLoading: isInitialLoading && !currentLoadError },
  }
}
