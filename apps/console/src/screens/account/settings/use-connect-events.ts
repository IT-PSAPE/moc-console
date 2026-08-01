import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import type { NotificationEventKey } from '@moc/notifications'
import { createNotificationRoute, deleteNotificationRoute, fetchNotificationRoutesForTarget, type NotificationRoute } from '@/data/notification-routes'
import type { ConnectEventsTarget } from './connect-events-modal'

export function useConnectEvents(target: ConnectEventsTarget | null, onClose: () => void) {
    const { toast } = useFeedback()
    const [routes, setRoutes] = useState<NotificationRoute[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [pendingKey, setPendingKey] = useState<NotificationEventKey | null>(null)

    useEffect(() => {
        if (!target) {
            setRoutes([])
            return
        }
        let cancelled = false
        setIsLoading(true)
        fetchNotificationRoutesForTarget(target.workspaceId, target.groupChatId, target.threadId)
            .then((data) => {
                if (!cancelled) setRoutes(data)
            })
            .catch((error: unknown) => {
                if (!cancelled) toast({ title: "Couldn't load event connections", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })
        return () => { cancelled = true }
    }, [target, toast])

    const routeByEvent = useMemo(() => new Map(routes.map((route) => [route.eventType, route])), [routes])

    const toggle = useCallback(async (eventKey: NotificationEventKey, connected: boolean) => {
        if (!target) return
        setPendingKey(eventKey)
        const existing = routeByEvent.get(eventKey)
        try {
            if (connected && !existing) {
                const created = await createNotificationRoute({ workspaceId: target.workspaceId, eventType: eventKey, groupChatId: target.groupChatId, threadId: target.threadId })
                setRoutes((current) => [...current, created])
            } else if (!connected && existing) {
                await deleteNotificationRoute(existing.id)
                setRoutes((current) => current.filter((route) => route.id !== existing.id))
            }
        } catch (error) {
            toast({ title: connected ? "Couldn't connect event" : "Couldn't disconnect event", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setPendingKey(null)
        }
    }, [routeByEvent, target, toast])

    function changeOpen(open: boolean) {
        if (!open) onClose()
    }

    const destinationLabel = target
        ? target.topicName ? `${target.groupTitle} › ${target.topicName}` : target.threadId !== null ? `${target.groupTitle} › Topic #${target.threadId}` : `${target.groupTitle} › General`
        : ''

    return { state: { isOpen: target !== null, isLoading, pendingKey, routeByEvent, destinationLabel }, actions: { toggle, changeOpen } }
}
