import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import type { NotificationEventKey } from '@moc/notifications'
import { createNotificationRoute, createUserNotificationRoute, deleteNotificationRoute, fetchNotificationRoutesForTarget, fetchNotificationRoutesForUser, type NotificationRoute } from '@/data/notification-routes'
import type { ConnectEventsTarget } from './connect-events-modal'

function fetchRoutesForTarget(target: ConnectEventsTarget): Promise<NotificationRoute[]> {
    return target.kind === 'group'
        ? fetchNotificationRoutesForTarget(target.workspaceId, target.groupChatId, target.threadId)
        : fetchNotificationRoutesForUser(target.workspaceId, target.userId)
}

function createRouteForTarget(target: ConnectEventsTarget, eventKey: NotificationEventKey): Promise<NotificationRoute> {
    return target.kind === 'group'
        ? createNotificationRoute({ workspaceId: target.workspaceId, eventType: eventKey, groupChatId: target.groupChatId, threadId: target.threadId })
        : createUserNotificationRoute({ workspaceId: target.workspaceId, eventType: eventKey, userId: target.userId })
}

function labelForTarget(target: ConnectEventsTarget | null): string {
    if (!target) return ''
    if (target.kind === 'user') return `${target.userName} · Telegram DM`
    if (target.topicName) return `${target.groupTitle} › ${target.topicName}`
    if (target.threadId !== null) return `${target.groupTitle} › Topic #${target.threadId}`
    return `${target.groupTitle} › General`
}

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
        fetchRoutesForTarget(target)
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
                const created = await createRouteForTarget(target, eventKey)
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

    return { state: { isOpen: target !== null, isLoading, pendingKey, routeByEvent, destinationLabel: labelForTarget(target) }, actions: { toggle, changeOpen } }
}
