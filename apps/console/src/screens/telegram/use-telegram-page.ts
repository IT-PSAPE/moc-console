import { useCallback, useEffect, useRef, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { fetchTelegramGroups, setTelegramGroupActive, type TelegramGroup } from '@/data/fetch-telegram-groups'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import type { UserWithRole } from '@/data/fetch-users'
import type { ConnectEventsTarget } from '@/features/notifications/connect-events-modal'
import { useUsers } from '@/features/users/users-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { invalidateWorkspaceResource } from '@/data/workspace-resource-cache'

export function useTelegramPage() {
  const { toast } = useFeedback()
  const { currentWorkspaceId, role } = useWorkspace()
  const { state: usersState, actions: { retryUsers } } = useUsers()
  const groupResource = useWorkspaceResource({ emptyValue: [] as TelegramGroup[], fetcher: fetchTelegramGroups, resource: 'telegram-groups', workspaceId: currentWorkspaceId })
  const loadGroupsResource = groupResource.load
  const updateGroupsResource = groupResource.updateData
  const [pendingChatId, setPendingChatId] = useState<string | null>(null)
  const [connectTarget, setConnectTarget] = useState<ConnectEventsTarget | null>(null)
  const pendingChatIdRef = useRef<string | null>(null)
  const isMountedRef = useRef(false)

  const reloadGroups = useCallback(() => loadGroupsResource(true), [loadGroupsResource])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      pendingChatIdRef.current = null
    }
  }, [])

  const loadMembers = useCallback(() => retryUsers(), [retryUsers])

  const toggleGroup = useCallback(async (chatId: string, active: boolean) => {
    const workspaceId = currentWorkspaceId
    if (!workspaceId || pendingChatIdRef.current !== null) return
    pendingChatIdRef.current = chatId
    setPendingChatId(chatId)
    updateGroupsResource((current) => current.map((group) => group.chatId === chatId ? { ...group, active } : group))
    try {
      await setTelegramGroupActive(workspaceId, chatId, active)
      invalidateWorkspaceResource(workspaceId, 'telegram-groups')
    } catch (error) {
      if (isMountedRef.current) {
        updateGroupsResource((current) => current.map((group) => group.chatId === chatId ? { ...group, active: !active } : group))
        toast({ title: "Couldn't update group", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
      }
    } finally {
      if (isMountedRef.current) {
        pendingChatIdRef.current = null
        setPendingChatId(null)
      }
    }
  }, [currentWorkspaceId, toast, updateGroupsResource])

  const openGroupConnect = useCallback((group: TelegramGroup, threadId: number | null, topicName: string | null) => {
    if (!currentWorkspaceId) return
    setConnectTarget({ kind: 'group', workspaceId: currentWorkspaceId, groupChatId: group.chatId, groupTitle: group.title || `(chat ${group.chatId})`, threadId, topicName })
  }, [currentWorkspaceId])

  const openMemberConnect = useCallback((user: UserWithRole) => {
    if (!currentWorkspaceId || !user.telegramChatId) return
    setConnectTarget({ kind: 'user', workspaceId: currentWorkspaceId, userId: user.id, userName: `${user.name} ${user.surname}`.trim() })
  }, [currentWorkspaceId])

  function closeConnect() {
    setConnectTarget(null)
  }

  const linkedUsers = usersState.users.filter((user) => Boolean(user.telegramChatId))
  const isInitialLoading = currentWorkspaceId !== null && (groupResource.isInitialLoading || usersState.isInitialLoading)

  return {
    state: { groups: groupResource.data, linkedUsers, isGroupsLoading: groupResource.isLoading, isMembersLoading: usersState.isLoading, isInitialLoading, groupsError: groupResource.error, membersError: usersState.error, pendingChatId, connectTarget },
    actions: { closeConnect, loadGroups: reloadGroups, loadMembers, openGroupConnect, openMemberConnect, toggleGroup },
    meta: {
      canManage: role?.can_manage_roles === true,
    },
  }
}
