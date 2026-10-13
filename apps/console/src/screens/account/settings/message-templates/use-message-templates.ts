import { useCallback, useEffect, useRef, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { fetchNotificationTemplates } from '@/data/notification-templates'
import type { MessageType } from '@moc/notifications'
import { useSettingsResourceLoading } from '../settings-loading-context'

export function useMessageTemplates() {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)
    const [customised, setCustomised] = useState<Set<MessageType>>(new Set())
    const [loadError, setLoadError] = useState<Error | null>(null)
    const [isRetrying, setIsRetrying] = useState(false)
    const loadRequestRef = useRef(0)

    const load = useCallback(async () => {
        const requestId = ++loadRequestRef.current
        if (!currentWorkspaceId) return
        const requestedWorkspaceId = currentWorkspaceId
        setLoadError(null)
        try {
            const rows = await fetchNotificationTemplates(requestedWorkspaceId)
            if (loadRequestRef.current === requestId) setCustomised(new Set(rows.map((row) => row.messageType)))
        } catch (error) {
            const nextError = error instanceof Error ? error : new Error('Unknown error')
            if (loadRequestRef.current === requestId) {
                setLoadError(nextError)
                toast({ title: "Couldn't load message templates", description: nextError.message, variant: 'error' })
            }
        } finally {
            if (loadRequestRef.current === requestId) {
                setLoadedWorkspaceId(requestedWorkspaceId)
                setIsRetrying(false)
            }
        }
    }, [currentWorkspaceId, toast])

    useEffect(() => {
        void load()
    }, [load])

    const isLoading = currentWorkspaceId !== null && loadedWorkspaceId !== currentWorkspaceId
    useSettingsResourceLoading('notifications', 'message-templates', isLoading)

    const retryLoad = useCallback(async () => {
        setIsRetrying(true)
        await load()
    }, [load])

    return { state: { isLoading, customised, hasWorkspace: currentWorkspaceId !== null, loadError, isRetrying }, actions: { retryLoad } }
}
