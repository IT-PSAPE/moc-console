import { useCallback, useEffect, useRef, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { fetchTelegramGroups, setTelegramGroupActive, type TelegramGroup } from '@/data/fetch-telegram-groups'
import type { UserWithRole } from '@/data/fetch-users'
import type { ConnectEventsTarget } from '@/features/notifications/connect-events-modal'
import { useUsers } from '@/features/users/users-provider'
import { useWorkspace } from '@/lib/workspace-context'

export function useTelegramPage() {
  const { toast } = useFeedback()
  const { currentWorkspaceId, role } = useWorkspace()
  const { state: usersState, actions: { loadUsers } } = useUsers()
  const [groups, setGroups] = useState<TelegramGroup[]>([])
  const [isGroupsLoading, setIsGroupsLoading] = useState(false)
  const [groupsError, setGroupsError] = useState<Error | null>(null)
  const [membersError, setMembersError] = useState<Error | null>(null)
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)
  const [pendingChatId, setPendingChatId] = useState<string | null>(null)
  const [connectTarget, setConnectTarget] = useState<ConnectEventsTarget | null>(null)
  const requestIdRef = useRef(0)
  const pendingChatIdRef = useRef<string | null>(null)
  const isMountedRef = useRef(false)

  const loadGroups = useCallback(async (workspaceId: string) => {
    setIsGroupsLoading(true)
    try {
      const nextGroups = await fetchTelegramGroups(workspaceId)
      if (isMountedRef.current) {
        setGroups(nextGroups)
        setGroupsError(null)
      }
    } catch (error) {
      if (isMountedRef.current) setGroupsError(toError(error, "Couldn't load Telegram groups"))
    } finally {
      if (isMountedRef.current) setIsGroupsLoading(false)
    }
  }, [])

  const reloadGroups = useCallback(() => currentWorkspaceId ? loadGroups(currentWorkspaceId) : Promise.resolve(), [currentWorkspaceId, loadGroups])

  const loadMembers = useCallback(async () => {
    try {
      await loadUsers()
      if (isMountedRef.current) setMembersError(null)
    } catch (error) {
      if (isMountedRef.current) setMembersError(toError(error, "Couldn't load members"))
    }
  }, [loadUsers])

  const loadAll = useCallback(async () => {
    const workspaceId = currentWorkspaceId
    if (!workspaceId) return
    const requestId = ++requestIdRef.current
    const results = await Promise.allSettled([fetchTelegramGroups(workspaceId), loadUsers()])
    if (!isMountedRef.current || requestIdRef.current !== requestId) return
    const [groupResult, membersResult] = results
    if (groupResult.status === 'fulfilled') {
      setGroups(groupResult.value)
      setGroupsError(null)
    } else {
      setGroupsError(toError(groupResult.reason, "Couldn't load Telegram groups"))
    }
    if (membersResult.status === 'fulfilled') setMembersError(null)
    else setMembersError(toError(membersResult.reason, "Couldn't load members"))
    setIsGroupsLoading(false)
    setLoadedWorkspaceId(workspaceId)
  }, [currentWorkspaceId, loadUsers])

  useEffect(() => {
    isMountedRef.current = true
    if (currentWorkspaceId) void loadAll()
    return () => {
      isMountedRef.current = false
      pendingChatIdRef.current = null
      requestIdRef.current += 1
    }
  }, [currentWorkspaceId, loadAll])

  const toggleGroup = useCallback(async (chatId: string, active: boolean) => {
    const workspaceId = currentWorkspaceId
    if (!workspaceId || pendingChatIdRef.current !== null) return
    pendingChatIdRef.current = chatId
    setPendingChatId(chatId)
    setGroups((current) => current.map((group) => group.chatId === chatId ? { ...group, active } : group))
    try {
      await setTelegramGroupActive(workspaceId, chatId, active)
    } catch (error) {
      if (isMountedRef.current) {
        setGroups((current) => current.map((group) => group.chatId === chatId ? { ...group, active: !active } : group))
        toast({ title: "Couldn't update group", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
      }
    } finally {
      if (isMountedRef.current) {
        pendingChatIdRef.current = null
        setPendingChatId(null)
      }
    }
  }, [currentWorkspaceId, toast])

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
  const isInitialLoading = currentWorkspaceId !== null && loadedWorkspaceId !== currentWorkspaceId

  return {
    state: { groups, linkedUsers, isGroupsLoading, isMembersLoading: usersState.isLoading, isInitialLoading, groupsError, membersError, pendingChatId, connectTarget },
    actions: { closeConnect, loadGroups: reloadGroups, loadMembers, openGroupConnect, openMemberConnect, toggleGroup },
    meta: {
      canManage: role?.can_manage_roles === true,
    },
  }
}

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback)
}
