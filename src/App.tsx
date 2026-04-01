import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { routes } from './screens/console-routes'
import { AppShell } from './features/app-shell'
import { BroadcastMediaScreen } from '@/screens/broadcast/media/page'
import { BroadcastOverviewScreen } from '@/screens/broadcast/page'
import { BroadcastScreen } from '@/screens/broadcast/broadcast/page'
import { CueSheetEventScreen } from '@/screens/cue-sheet/events/page'
import { CueSheetOverviewScreen } from '@/screens/cue-sheet/page'
import { DashboardScreen } from '@/screens/dashboard/page'
import { EquipmentBookingsScreen } from '@/screens/equipment/booking/page'
import { EquipmentInventoryScreen } from '@/screens/equipment/inventory/page'
import { EquipmentMaintenanceScreen } from '@/screens/equipment/maintenance/page'
import { EquipmentOverviewScreen } from '@/screens/equipment/page'
import { EquipmentReportsScreen } from '@/screens/equipment/reports/page'
import { RequestsAllRequestsScreen } from '@/screens/requests/all-requests/page'
import { RequestsArchivedScreen } from '@/screens/requests/archived/page'
import { RequestsOverviewScreen } from '@/screens/requests/page'
import { RequestDetailScreen } from '@/screens/requests/detail/page'
import { RequestsReportsScreen } from '@/screens/requests/reports/page'
import { CueSheetChecklistScreen } from './screens/cue-sheet/checklist/page'
import { BreadcrumbProvider } from './components/navigation/breadcrumb'
import { SidebarProvider } from './components/navigation/sidebar'
import { TopBarProvider } from './features/topbar'

function AppProviders() {
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

const router = createBrowserRouter([
    {
        element: <AppProviders />,
        children: [
            { index: true, element: <Navigate to={`/${routes.dashboard}`} replace /> },
            { path: routes.dashboard, element: <DashboardScreen /> },
            { path: routes.requestsOverview, element: <RequestsOverviewScreen /> },
            { path: routes.requestsAllRequests, element: <RequestsAllRequestsScreen /> },
            { path: routes.requestsArchived, element: <RequestsArchivedScreen /> },
            { path: routes.requestsDetail, element: <RequestDetailScreen /> },
            { path: routes.requestsReports, element: <RequestsReportsScreen /> },
            { path: routes.equipmentOverview, element: <EquipmentOverviewScreen /> },
            { path: routes.equipmentInventory, element: <EquipmentInventoryScreen /> },
            { path: routes.equipmentBookings, element: <EquipmentBookingsScreen /> },
            { path: routes.equipmentMaintenance, element: <EquipmentMaintenanceScreen /> },
            { path: routes.equipmentReports, element: <EquipmentReportsScreen /> },
            { path: routes.broadcastOverview, element: <BroadcastOverviewScreen /> },
            { path: routes.broadcastMedia, element: <BroadcastMediaScreen /> },
            { path: routes.broadcastBroadcast, element: <BroadcastScreen /> },
            { path: routes.cueSheetOverview, element: <CueSheetOverviewScreen /> },
            { path: routes.cueSheetEvent, element: <CueSheetEventScreen /> },
            { path: routes.cueSheetChecklist, element: <CueSheetChecklistScreen /> },
        ],
    },
    { path: '*', element: <Navigate to={`/${routes.dashboard}`} replace /> },
])

function App() {
    return <RouterProvider router={router} />
}

export default App
