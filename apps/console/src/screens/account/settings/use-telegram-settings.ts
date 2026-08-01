import { useCallback, useEffect, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { fetchTelegramGroups, setTelegramGroupActive, type TelegramGroup } from '@/data/fetch-telegram-groups'
import { useWorkspace } from '@/lib/workspace-context'
import type { ConnectEventsTarget } from './connect-events-modal'

export function useTelegramSettings() {
    const { toast } = useFeedback()
    const { currentWorkspaceId, workspaces } = useWorkspace()
    const [groups, setGroups] = useState<TelegramGroup[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pendingChatId, setPendingChatId] = useState<string | null>(null)
    const [connectTarget, setConnectTarget] = useState<ConnectEventsTarget | null>(null)

    const loadGroups = useCallback(async () => {
        if (!currentWorkspaceId) {
            setGroups([])
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            setGroups(await fetchTelegramGroups(currentWorkspaceId))
        } catch (error) {
            toast({ title: "Couldn't load Telegram groups", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
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
        setConnectTarget({ workspaceId: currentWorkspaceId, groupChatId: group.chatId, groupTitle: group.title || `(chat ${group.chatId})`, threadId, topicName })
    }

    function closeConnect() {
        setConnectTarget(null)
    }

    return {
        state: { groups, isLoading, pendingChatId, connectTarget, currentWorkspaceSlug: workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.slug },
        actions: { toggleGroup, openConnect, closeConnect },
    }
}
