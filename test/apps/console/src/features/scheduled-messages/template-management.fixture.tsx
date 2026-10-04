import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { ScheduledMessagesScreen } from '@/screens/scheduled-messages/page'
import { ScheduledTemplateScreen } from '@/screens/scheduled-messages/templates/page'
import { ScheduledMessageComposeScreen } from '@/screens/scheduled-messages/compose/page'

function Layout() {
    return <ScheduledMessages.Root><Outlet /><ScheduledMessages.Editor /></ScheduledMessages.Root>
}
const router = createBrowserRouter([{ element: <Layout />, children: [
    { path: '/scheduled-messages', element: <ScheduledMessagesScreen /> },
    { path: '/scheduled-messages/templates/new', element: <ScheduledTemplateScreen /> },
    { path: '/scheduled-messages/templates/:id', element: <ScheduledTemplateScreen /> },
    { path: '/scheduled-messages/new', element: <ScheduledMessageComposeScreen /> },
] }])
createRoot(document.getElementById('root')!).render(<OverlayProvider><RouterProvider router={router} /></OverlayProvider>)
