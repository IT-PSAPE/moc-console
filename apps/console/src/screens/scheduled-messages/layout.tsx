import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SplitPanel } from '@moc/ui/components/layout/split-panel'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { useScheduledMessageAccess } from '@/features/scheduled-messages/use-scheduled-message-access'
import { routes } from '../console-routes'
import { ScheduledMessagesScreen } from './page'

export function ScheduledMessagesLayout() {
    const canManage = useScheduledMessageAccess()
    const location = useLocation()
    const navigate = useNavigate()
    const basePath = `/${routes.scheduledMessages}`
    const hasChildRoute = location.pathname !== basePath

    function closeDetail(open: boolean): void {
        if (!open) navigate(basePath)
    }

    if (!canManage) return <Navigate to={`/${routes.overview}`} replace />
    return (
        <ScheduledMessages.Root>
            <SplitPanel open={hasChildRoute} onOpenChange={closeDetail} detailLabel="Message composer">
                <SplitPanel.Primary><ScheduledMessagesScreen /></SplitPanel.Primary>
                <SplitPanel.ResizeHandle />
                <SplitPanel.Detail><Outlet /></SplitPanel.Detail>
            </SplitPanel>
            <ScheduledMessages.Editor />
            <ScheduledMessages.Activity />
        </ScheduledMessages.Root>
    )
}
