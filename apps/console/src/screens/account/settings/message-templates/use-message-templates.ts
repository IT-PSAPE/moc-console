import { useEffect, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { fetchNotificationTemplates } from '@/data/notification-templates'
import type { MessageType } from '@moc/notifications'

export function useMessageTemplates() {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)
    const [customised, setCustomised] = useState<Set<MessageType>>(new Set())

    useEffect(() => {
        if (!currentWorkspaceId) return
        let cancelled = false
        fetchNotificationTemplates(currentWorkspaceId)
            .then((rows) => {
                if (!cancelled) setCustomised(new Set(rows.map((row) => row.messageType)))
            })
            .catch((error: unknown) => {
                if (!cancelled) toast({ title: "Couldn't load message templates", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
            })
            .finally(() => {
                if (!cancelled) setLoadedWorkspaceId(currentWorkspaceId)
            })
        return () => { cancelled = true }
    }, [currentWorkspaceId, toast])

    return { state: { isLoading: currentWorkspaceId !== null && loadedWorkspaceId !== currentWorkspaceId, customised, hasWorkspace: currentWorkspaceId !== null } }
}
