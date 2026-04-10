import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { routes } from './screens/console-routes'
import { Spinner } from '@/components/feedback/spinner'
import { useAuth } from './lib/auth-context'
import { AppShell } from './features/app-shell'
import { BroadcastMediaScreen } from '@/screens/broadcast/media/page'
import { BroadcastOverviewScreen } from '@/screens/broadcast/page'
import { PlaylistScreen } from '@/screens/broadcast/playlist/page'
import { PlaylistDetailScreen } from '@/screens/broadcast/detail/page'
import { CueSheetEventScreen } from '@/screens/cue-sheet/events/page'
import { CueSheetEventDetailScreen } from '@/screens/cue-sheet/events/detail/page'
import { CueSheetOverviewScreen } from '@/screens/cue-sheet/page'
import { DashboardScreen } from '@/screens/dashboard/page'
import { EquipmentBookingsScreen } from '@/screens/equipment/booking/page'
import { EquipmentInventoryScreen } from '@/screens/equipment/inventory/page'
import { EquipmentMaintenanceScreen } from '@/screens/equipment/maintenance/page'
import { EquipmentOverviewScreen } from '@/screens/equipment/page'
import { EquipmentDetailScreen } from '@/screens/equipment/detail/page'
import { RequestsAllRequestsScreen } from '@/screens/requests/all-requests/page'
import { RequestsArchivedScreen } from '@/screens/requests/archived/page'
import { RequestsOverviewScreen } from '@/screens/requests/page'
import { RequestDetailScreen } from '@/screens/requests/detail/page'
import { RequestsProvider } from '@/features/requests/request-provider'
import { EquipmentProvider } from '@/features/equipment/equipment-provider'
import { BroadcastProvider } from '@/features/broadcast/broadcast-provider'
import { CueSheetChecklistScreen } from './screens/cue-sheet/checklist/page'
import { CueSheetChecklistDetailScreen } from './screens/cue-sheet/checklist/detail/page'
import { CueSheetTemplatesScreen } from './screens/cue-sheet/templates/page'
import { CueSheetProvider } from './features/cue-sheet/cue-sheet-provider'
import { BreadcrumbProvider } from './components/navigation/breadcrumb'
import { SidebarProvider } from './components/navigation/sidebar'
import { TopBarProvider } from './features/topbar'
import { LoginScreen } from './screens/auth/login'
import { SignupScreen } from './screens/auth/signup'
import { ResetPasswordScreen } from './screens/auth/reset-password'

function RequireAuth() {
    const { session, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex min-h-dvh items-center justify-center">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!session) {
        return <Navigate to={`/${routes.login}`} replace />
    }

    return (
        <BreadcrumbProvider>
            <SidebarProvider>
                <TopBarProvider>
                    <AppShell>
                        <Outlet />
                    </AppShell>
                </TopBarProvider>
            </SidebarProvider>
        </BreadcrumbProvider>
    )
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
    const { session, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex min-h-dvh items-center justify-center">
                <Spinner size="lg" />
            </div>
        )
    }

    if (session) {
        return <Navigate to={`/${routes.dashboard}`} replace />
    }

    return children
}

const router = createBrowserRouter([
    // Auth routes — redirect to dashboard if already signed in
    { path: routes.login, element: <RedirectIfAuth><LoginScreen /></RedirectIfAuth> },
    { path: routes.signup, element: <RedirectIfAuth><SignupScreen /></RedirectIfAuth> },
    { path: routes.resetPassword, element: <RedirectIfAuth><ResetPasswordScreen /></RedirectIfAuth> },

    // Protected app routes
    {
        element: <RequireAuth />,
        children: [
            { index: true, element: <Navigate to={`/${routes.dashboard}`} replace /> },
            { path: routes.dashboard, element: <RequestsProvider><EquipmentProvider><BroadcastProvider><CueSheetProvider><DashboardScreen /></CueSheetProvider></BroadcastProvider></EquipmentProvider></RequestsProvider> },
            {
                element: <RequestsProvider><Outlet /></RequestsProvider>,
                children: [
                    { path: routes.requestsOverview, element: <RequestsOverviewScreen /> },
                    { path: routes.requestsAllRequests, element: <RequestsAllRequestsScreen /> },
                    { path: routes.requestsArchived, element: <RequestsArchivedScreen /> },
                    { path: routes.requestsDetail, element: <RequestDetailScreen /> },
                ],
            },
            {
                element: <EquipmentProvider><Outlet /></EquipmentProvider>,
                children: [
                    { path: routes.equipmentOverview, element: <EquipmentOverviewScreen /> },
                    { path: routes.equipmentInventory, element: <EquipmentInventoryScreen /> },
                    { path: routes.equipmentBookings, element: <EquipmentBookingsScreen /> },
                    { path: routes.equipmentMaintenance, element: <EquipmentMaintenanceScreen /> },
                    { path: routes.equipmentDetail, element: <EquipmentDetailScreen /> },
                ],
            },
            {
                element: <BroadcastProvider><Outlet /></BroadcastProvider>,
                children: [
                    { path: routes.broadcastOverview, element: <BroadcastOverviewScreen /> },
                    { path: routes.broadcastMedia, element: <BroadcastMediaScreen /> },
                    { path: routes.broadcastPlaylists, element: <PlaylistScreen /> },
                    { path: routes.broadcastPlaylistDetail, element: <PlaylistDetailScreen /> },
                ],
            },
            {
                element: <CueSheetProvider><Outlet /></CueSheetProvider>,
                children: [
                    { path: routes.cueSheetOverview, element: <CueSheetOverviewScreen /> },
                    { path: routes.cueSheetEvents, element: <CueSheetEventScreen /> },
                    { path: routes.cueSheetEventDetail, element: <CueSheetEventDetailScreen /> },
                    { path: routes.cueSheetChecklists, element: <CueSheetChecklistScreen /> },
                    { path: routes.cueSheetChecklistDetail, element: <CueSheetChecklistDetailScreen /> },
                    { path: routes.cueSheetTemplates, element: <CueSheetTemplatesScreen /> },
                ],
            },
        ],
    },
    { path: '*', element: <Navigate to={`/${routes.login}`} replace /> },
])

function App() {
    return <RouterProvider router={router} />
}

export default App
