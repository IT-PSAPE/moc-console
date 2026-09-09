import { useCallback, useEffect, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { fetchTelegramGroups, setTelegramGroupActive, type TelegramGroup } from '@/data/fetch-telegram-groups'
import { fetchUsersWithRoles, type UserWithRole } from '@/data/fetch-users'
import { useWorkspace } from '@/lib/workspace-context'
import type { ConnectEventsTarget } from './connect-events-modal'

export function useTelegramSettings() {
    const { toast } = useFeedback()
    const { currentWorkspaceId, workspaces } = useWorkspace()
    const [groups, setGroups] = useState<TelegramGroup[]>([])
    const [users, setUsers] = useState<UserWithRole[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pendingChatId, setPendingChatId] = useState<string | null>(null)
    const [connectTarget, setConnectTarget] = useState<ConnectEventsTarget | null>(null)

    const loadGroups = useCallback(async () => {
        if (!currentWorkspaceId) {
            setGroups([])
            setUsers([])
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            const [nextGroups, nextUsers] = await Promise.all([
                fetchTelegramGroups(currentWorkspaceId),
                fetchUsersWithRoles(currentWorkspaceId),
            ])
            setGroups(nextGroups)
            setUsers(nextUsers)
        } catch (error) {
            toast({ title: "Couldn't load Telegram settings", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setIsLoading(false)
        }
    }, [currentWorkspaceId, toast])

    useEffect(() => { void loadGroups() }, [loadGroups])

    const toggleGroup = useCallback(async (chatId: string, active: boolean) => {
        setPendingChatId(chatId)
        setGroups((current) => current.map((group) => group.chatId === chatId ? { ...group, active } : group))
        try {
            await setTelegramGroupActive(chatId, active)
        } catch (error) {
            setGroups((current) => current.map((group) => group.chatId === chatId ? { ...group, active: !active } : group))
            toast({ title: "Couldn't update group", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setPendingChatId(null)
        }
    }, [toast])

    function openConnect(group: TelegramGroup, threadId: number | null, topicName: string | null) {
        if (!currentWorkspaceId) return
        setConnectTarget({ kind: 'group', workspaceId: currentWorkspaceId, groupChatId: group.chatId, groupTitle: group.title || `(chat ${group.chatId})`, threadId, topicName })
    }

    function openConnectUser(user: UserWithRole) {
        if (!currentWorkspaceId || !user.telegramChatId) return
        setConnectTarget({ kind: 'user', workspaceId: currentWorkspaceId, userId: user.id, userName: `${user.name} ${user.surname}`.trim() })
    }

    function closeConnect() {
        setConnectTarget(null)
    }

    return {
        state: { groups, users, isLoading, pendingChatId, connectTarget, currentWorkspaceSlug: workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.slug },
        actions: { toggleGroup, openConnect, openConnectUser, closeConnect },
    }
}
