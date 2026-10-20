import { useCallback, useMemo, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import type { NotificationEventDefinition, NotificationEventKey } from '@moc/notifications'
import { createNotificationRoute, createUserNotificationRoute, deleteNotificationRoute, fetchNotificationRoutesForTarget, fetchNotificationRoutesForUser, type NotificationRoute } from '@/data/notification-routes'
import type { ConnectEventsTarget } from './connect-events-modal'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'

const NOTIFICATION_OPTIONS = [
    { key: 'stream.created', label: 'YouTube stream', trigger: 'a YouTube stream is created or first found during sync.' },
    { key: 'meeting.created', label: 'Zoom meeting', trigger: 'a Zoom meeting is created or first found during sync.' },
    { key: 'request.created', label: 'Requests', trigger: 'a new request is submitted.' },
    { key: 'booking.created', label: 'Equipment booking', trigger: 'a new equipment booking is submitted.' },
    { key: 'venue_booking.created', label: 'Venue booking', trigger: 'a new venue booking is submitted.' },
] as const

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
    const fetcher = useCallback((workspaceId: string) => workspaceId && target ? fetchRoutesForTarget(target) : Promise.resolve([]), [target])
    const resourceId = target?.kind === 'group' ? `group:${target.groupChatId}:${target.threadId ?? 'main'}` : target?.kind === 'user' ? `user:${target.userId}` : 'closed'
    const resource = useWorkspaceResource({ emptyValue: [] as NotificationRoute[], fetcher, resource: `notification-routes:${resourceId}`, workspaceId: target?.workspaceId ?? null, enabled: Boolean(target) })
    const { data: routes, isLoading, error: resourceError, load, updateData } = resource
    const [pendingKey, setPendingKey] = useState<NotificationEventKey | null>(null)
    const error = useMemo(() => resourceError instanceof Error ? resourceError : resourceError ? new Error("Couldn't load event connections") : null, [resourceError])

    const routeByEvent = useMemo(() => new Map(routes.map((route) => [route.eventType, route])), [routes])

    const toggle = useCallback(async (eventKey: NotificationEventKey, connected: boolean) => {
        if (!target || error) return
        setPendingKey(eventKey)
        const existing = routeByEvent.get(eventKey)
        try {
            if (connected && !existing) {
                const created = await createRouteForTarget(target, eventKey)
                updateData((current) => [...current, created])
            } else if (!connected && existing) {
                await deleteNotificationRoute(target.workspaceId, existing.id)
                updateData((current) => current.filter((route) => route.id !== existing.id))
            }
        } catch (error) {
            toast({ title: connected ? "Couldn't connect event" : "Couldn't disconnect event", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setPendingKey(null)
        }
    }, [error, routeByEvent, target, toast, updateData])

    function retryRoutes() {
        void load(true)
    }

    function changeOpen(open: boolean) {
        if (!open) onClose()
    }

    const messageAction = target?.kind === 'user' ? 'Send this person a direct message when' : 'Send a message to this group or topic when'
    const notificationOptions: NotificationEventDefinition[] = NOTIFICATION_OPTIONS.map(option => ({
        key: option.key,
        label: option.label,
        description: `${messageAction} ${option.trigger}`,
    }))

    return { state: { notificationOptions, isOpen: target !== null, isLoading, pendingKey, routeByEvent, destinationLabel: labelForTarget(target), error }, actions: { toggle, changeOpen, retryRoutes } }
}
