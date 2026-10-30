import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { ScheduledOccurrence } from '@moc/notifications'
import { useListDetailSelection } from '@/hooks/use-list-detail-selection'
import { routes } from '@/screens/console-routes'

type ScheduledOccurrenceLinkOptions = {
    occurrences: readonly ScheduledOccurrence[]
    workspaceId: string | null
    ready: boolean
    enabled: boolean
}

export function useScheduledOccurrenceLink({ occurrences, workspaceId, ready, enabled }: ScheduledOccurrenceLinkOptions) {
    const { pathname } = useLocation()
    const selection = useListDetailSelection(occurrences, 'occurrence')
    const { selectedId, selectedItem } = selection.state
    const { close } = selection.actions
    const [scope, setScope] = useState({ workspaceId, blocked: false })
    const workspaceChanged = scope.workspaceId !== workspaceId
    // Adjust the selection scope before rendering another workspace's data.
    if (workspaceChanged) setScope({ workspaceId, blocked: Boolean(selectedId) })
    else if (scope.blocked && !selectedId) setScope({ workspaceId, blocked: false })
    const onUpcomingList = enabled && pathname === `/${routes.scheduledMessages}`
    const occurrence = !workspaceChanged && !scope.blocked && onUpcomingList && ready && selectedItem?.workspace_id === workspaceId ? selectedItem : null

    useEffect(() => {
        if (!selectedId) return
        if (workspaceChanged || scope.blocked || (onUpcomingList && ready && !occurrence)) close()
    }, [close, occurrence, onUpcomingList, ready, scope.blocked, selectedId, workspaceChanged])

    return { occurrence, close }
}
