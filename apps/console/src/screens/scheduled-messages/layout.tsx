import { Navigate, Outlet } from 'react-router-dom'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { useScheduledMessageAccess } from '@/features/scheduled-messages/use-scheduled-message-access'
import { routes } from '../console-routes'

export function ScheduledMessagesLayout() {
    const canManage = useScheduledMessageAccess()
    if (!canManage) return <Navigate to={`/${routes.requests}`} replace />
    return <ScheduledMessages.Root><Outlet /><ScheduledMessages.Editor /></ScheduledMessages.Root>
}
