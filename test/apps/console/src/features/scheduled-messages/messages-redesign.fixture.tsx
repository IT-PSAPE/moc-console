import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import { FeedbackProvider } from '@moc/ui/components/feedback/feedback-provider'
import '@moc/ui/styles.css'
import { ScheduledMessagesLayout } from '@/screens/scheduled-messages/layout'
import { ScheduledMessagesScreen } from '@/screens/scheduled-messages/page'
import { ScheduledMessageComposeScreen } from '@/screens/scheduled-messages/compose/page'
import { queryClient } from '@/lib/query-client'

const router = createBrowserRouter([{ path: '/scheduled-messages', element: <ScheduledMessagesLayout />, children: [
    { index: true, element: <ScheduledMessagesScreen /> },
    { path: 'new', element: <ScheduledMessageComposeScreen /> },
    { path: 'templates/*', element: <Navigate to="/scheduled-messages/new" replace /> },
] }])
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><OverlayProvider><FeedbackProvider><RouterProvider router={router} /></FeedbackProvider></OverlayProvider></QueryClientProvider>)
