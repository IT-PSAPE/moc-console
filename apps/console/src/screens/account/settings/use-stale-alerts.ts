import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import type { User } from '@moc/types/requests'
import { addNotificationRecipient, fetchNotificationRecipients, removeNotificationRecipient, type NotificationRecipient } from '@/data/notification-recipients'
import { DEFAULT_STALE_THRESHOLD_DAYS, fetchNotificationSettings, updateStaleThresholdDays } from '@/data/notification-settings'

export function useStaleAlerts() {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const [recipients, setRecipients] = useState<NotificationRecipient[]>([])
    const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_STALE_THRESHOLD_DAYS))
    const [savedThreshold, setSavedThreshold] = useState(DEFAULT_STALE_THRESHOLD_DAYS)
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setRecipients([])
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            const [people, settings] = await Promise.all([fetchNotificationRecipients(currentWorkspaceId), fetchNotificationSettings(currentWorkspaceId)])
            setRecipients(people)
            setSavedThreshold(settings.staleThresholdDays)
            setThresholdInput(String(settings.staleThresholdDays))
        } catch (error) {
            toast({ title: "Couldn't load stale-alert settings", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setIsLoading(false)
        }
    }, [currentWorkspaceId, toast])

    useEffect(() => { void load() }, [load])

    const addRecipient = useCallback(async (user: User) => {
        if (!currentWorkspaceId) return
        setRecipients((current) => [...current, { ...user, recipientId: `temp-${user.id}` }])
        try {
            await addNotificationRecipient(currentWorkspaceId, user.id)
            await load()
        } catch (error) {
            setRecipients((current) => current.filter((recipient) => recipient.id !== user.id))
            toast({ title: "Couldn't add recipient", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        }
    }, [currentWorkspaceId, load, toast])

    const removeRecipient = useCallback(async (userId: string) => {
        if (!currentWorkspaceId) return
        const previous = recipients
        setRecipients((current) => current.filter((recipient) => recipient.id !== userId))
        try {
            await removeNotificationRecipient(currentWorkspaceId, userId)
        } catch (error) {
            setRecipients(previous)
            toast({ title: "Couldn't remove recipient", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        }
    }, [currentWorkspaceId, recipients, toast])

    const changeThreshold = useCallback((event: ChangeEvent<HTMLInputElement>) => setThresholdInput(event.target.value), [])
    const saveThreshold = useCallback(async () => {
        if (!currentWorkspaceId) return
        const days = Number.parseInt(thresholdInput, 10)
        if (!Number.isInteger(days) || days < 1) return setThresholdInput(String(savedThreshold))
        if (days === savedThreshold) return
        try {
            await updateStaleThresholdDays(currentWorkspaceId, days)
            setSavedThreshold(days)
            toast({ title: 'Stale threshold updated', variant: 'success' })
        } catch (error) {
            setThresholdInput(String(savedThreshold))
            toast({ title: "Couldn't update threshold", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        }
    }, [currentWorkspaceId, savedThreshold, thresholdInput, toast])

    return { state: { recipients, thresholdInput, savedThreshold, isLoading }, actions: { addRecipient, removeRecipient, changeThreshold, saveThreshold } }
}
