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
import { RequestsReportsScreen } from '@/screens/requests/reports/page'
import { SearchScreen } from '@/screens/search/page'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/app-shell'
import { routes } from './screens/console-routes'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppShell><Outlet /></AppShell>}>
                    <Route index element={<Navigate to={`/${routes.dashboard}`} replace />} />
                    <Route path={routes.dashboard} element={<DashboardScreen />} />
                    <Route path={routes.search} element={<SearchScreen />} />
                    <Route path={routes.requestsOverview} element={<RequestsOverviewScreen />} />
                    <Route path={routes.requestsAllRequests} element={<RequestsAllRequestsScreen />} />
                    <Route path={routes.requestsArchived} element={<RequestsArchivedScreen />} />
                    <Route path={routes.requestsReports} element={<RequestsReportsScreen />} />
                    <Route path={routes.equipmentOverview} element={<EquipmentOverviewScreen />} />
                    <Route path={routes.equipmentInventory} element={<EquipmentInventoryScreen />} />
                    <Route path={routes.equipmentBookings} element={<EquipmentBookingsScreen />} />
                    <Route path={routes.equipmentMaintenance} element={<EquipmentMaintenanceScreen />} />
                    <Route path={routes.equipmentReports} element={<EquipmentReportsScreen />} />
                    <Route path={routes.broadcastOverview} element={<BroadcastOverviewScreen />} />
                    <Route path={routes.broadcastMedia} element={<BroadcastMediaScreen />} />
                    <Route path={routes.broadcastBroadcast} element={<BroadcastScreen />} />
                    <Route path={routes.cueSheetOverview} element={<CueSheetOverviewScreen />} />
                    <Route path={routes.cueSheetEvent} element={<CueSheetEventScreen />} />
                </Route>
                <Route path="*" element={<Navigate to={`/${routes.dashboard}`} replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
