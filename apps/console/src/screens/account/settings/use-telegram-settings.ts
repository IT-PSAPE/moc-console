import { useCallback, useEffect, useRef, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { fetchTelegramGroups, setTelegramGroupActive, type TelegramGroup } from '@/data/fetch-telegram-groups'
import { useWorkspace } from '@/lib/workspace-context'
import type { ConnectEventsTarget } from '@/features/notifications/connect-events-modal'
import { useSettingsResourceLoading } from './settings-loading-context'

export function useTelegramSettings() {
    const { toast } = useFeedback()
    const { currentWorkspaceId, workspaces } = useWorkspace()
    const [groups, setGroups] = useState<TelegramGroup[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [pendingChatId, setPendingChatId] = useState<string | null>(null)
    const [connectTarget, setConnectTarget] = useState<ConnectEventsTarget | null>(null)
    const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)
    const loadRequestRef = useRef(0)

    const loadGroups = useCallback(async () => {
        const requestId = ++loadRequestRef.current
        if (!currentWorkspaceId) {
            setGroups([])
            setLoadError(false)
            setIsLoading(false)
            setLoadedWorkspaceId(null)
            return
        }
        const requestedWorkspaceId = currentWorkspaceId
        setIsLoading(true)
        setLoadError(false)
        try {
            const nextGroups = await fetchTelegramGroups(requestedWorkspaceId)
            if (loadRequestRef.current === requestId) setGroups(nextGroups)
        } catch {
            if (loadRequestRef.current === requestId) setLoadError(true)
        } finally {
            if (loadRequestRef.current === requestId) {
                setIsLoading(false)
                setLoadedWorkspaceId(requestedWorkspaceId)
            }
        }
    }, [currentWorkspaceId])

    useEffect(() => { void loadGroups() }, [loadGroups])

    const isInitialLoading = currentWorkspaceId !== null && loadedWorkspaceId !== currentWorkspaceId
    useSettingsResourceLoading('notifications', 'telegram-groups', isInitialLoading)

    const toggleGroup = useCallback(async (chatId: string, active: boolean) => {
        if (!currentWorkspaceId) return
        setPendingChatId(chatId)
        setGroups((current) => current.map((group) => group.chatId === chatId ? { ...group, active } : group))
        try {
            await setTelegramGroupActive(currentWorkspaceId, chatId, active)
        } catch (error) {
            setGroups((current) => current.map((group) => group.chatId === chatId ? { ...group, active: !active } : group))
            toast({ title: "Couldn't update group", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setPendingChatId(null)
        }
    }, [currentWorkspaceId, toast])

    function openConnect(group: TelegramGroup, threadId: number | null, topicName: string | null) {
        if (!currentWorkspaceId) return
        setConnectTarget({ kind: 'group', workspaceId: currentWorkspaceId, groupChatId: group.chatId, groupTitle: group.title || `(chat ${group.chatId})`, threadId, topicName })
    }

    function closeConnect() {
        setConnectTarget(null)
    }

    return {
        state: { groups, isLoading, loadError, pendingChatId, connectTarget, currentWorkspaceSlug: workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.slug },
        actions: { toggleGroup, openConnect, closeConnect, loadGroups },
    }
}
