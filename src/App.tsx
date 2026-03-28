import { BroadcastMediaScreen } from '@/screens/broadcast/broadcast-media-screen'
import { BroadcastOverviewScreen } from '@/screens/broadcast/broadcast-overview-screen'
import { BroadcastScreen } from '@/screens/broadcast/broadcast-screen'
import { CueSheetEventScreen } from '@/screens/cue-sheet/cue-sheet-event-screen'
import { CueSheetOverviewScreen } from '@/screens/cue-sheet/cue-sheet-overview-screen'
import { DashboardScreen } from '@/screens/dashboard/dashboard-screen'
import { EquipmentBookingsScreen } from '@/screens/equipment/equipment-bookings-screen'
import { EquipmentInventoryScreen } from '@/screens/equipment/equipment-inventory-screen'
import { EquipmentMaintenanceScreen } from '@/screens/equipment/equipment-maintenance-screen'
import { EquipmentOverviewScreen } from '@/screens/equipment/equipment-overview-screen'
import { EquipmentReportsScreen } from '@/screens/equipment/equipment-reports-screen'
import { RequestsAllRequestsScreen } from '@/screens/requests/requests-all-requests-screen'
import { RequestsArchivedScreen } from '@/screens/requests/requests-archived-screen'
import { RequestsOverviewScreen } from '@/screens/requests/requests-overview-screen'
import { RequestsReportsScreen } from '@/screens/requests/requests-reports-screen'
import { SearchScreen } from '@/screens/search/search-screen'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/app-shell'


const consoleRoutes = {
    dashboard: 'dashboard',
    search: 'search',
    requestsOverview: 'requests/overview',
    requestsAllRequests: 'requests/all-requests',
    requestsArchived: 'requests/archived',
    requestsReports: 'requests/reports',
    equipmentOverview: 'equipment/overview',
    equipmentInventory: 'equipment/inventory',
    equipmentBookings: 'equipment/bookings',
    equipmentMaintenance: 'equipment/maintenance',
    equipmentReports: 'equipment/reports',
    broadcastOverview: 'broadcast/overview',
    broadcastMedia: 'broadcast/media',
    broadcastBroadcast: 'broadcast/broadcast',
    cueSheetOverview: 'cue-sheet/overview',
    cueSheetEvent: 'cue-sheet/event',
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppShell><Outlet /></AppShell>}>
                    <Route index element={<Navigate to={`/${consoleRoutes.dashboard}`} replace />} />
                    <Route path={consoleRoutes.dashboard} element={<DashboardScreen />} />
                    <Route path={consoleRoutes.search} element={<SearchScreen />} />
                    <Route path={consoleRoutes.requestsOverview} element={<RequestsOverviewScreen />} />
                    <Route path={consoleRoutes.requestsAllRequests} element={<RequestsAllRequestsScreen />} />
                    <Route path={consoleRoutes.requestsArchived} element={<RequestsArchivedScreen />} />
                    <Route path={consoleRoutes.requestsReports} element={<RequestsReportsScreen />} />
                    <Route path={consoleRoutes.equipmentOverview} element={<EquipmentOverviewScreen />} />
                    <Route path={consoleRoutes.equipmentInventory} element={<EquipmentInventoryScreen />} />
                    <Route path={consoleRoutes.equipmentBookings} element={<EquipmentBookingsScreen />} />
                    <Route path={consoleRoutes.equipmentMaintenance} element={<EquipmentMaintenanceScreen />} />
                    <Route path={consoleRoutes.equipmentReports} element={<EquipmentReportsScreen />} />
                    <Route path={consoleRoutes.broadcastOverview} element={<BroadcastOverviewScreen />} />
                    <Route path={consoleRoutes.broadcastMedia} element={<BroadcastMediaScreen />} />
                    <Route path={consoleRoutes.broadcastBroadcast} element={<BroadcastScreen />} />
                    <Route path={consoleRoutes.cueSheetOverview} element={<CueSheetOverviewScreen />} />
                    <Route path={consoleRoutes.cueSheetEvent} element={<CueSheetEventScreen />} />
                </Route>
                <Route path="*" element={<Navigate to={`/${consoleRoutes.dashboard}`} replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
