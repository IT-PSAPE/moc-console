import type { ReactNode } from 'react'
import { consoleRoutes } from '@/screens/console-routes'
import { Sidebar } from './sidebar'
import { Cast, Drama, FileText, LayoutGrid, Package, Search } from 'lucide-react'
import { TopBar } from './topbar'
import { useLocation, useNavigate } from 'react-router-dom'

type AppShellProps = {
    children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const { pathname } = location

    function navigateToRoute(route: string) {
        navigate(`/${route}`)
    }

    function handleDashboardClick() {
        navigateToRoute(consoleRoutes.dashboard)
    }

    function handleSearchClick() {
        navigateToRoute(consoleRoutes.search)
    }

    function handleRequestsOverviewClick() {
        navigateToRoute(consoleRoutes.requestsOverview)
    }

    function handleRequestsAllRequestsClick() {
        navigateToRoute(consoleRoutes.requestsAllRequests)
    }

    function handleRequestsArchivedClick() {
        navigateToRoute(consoleRoutes.requestsArchived)
    }

    function handleRequestsReportsClick() {
        navigateToRoute(consoleRoutes.requestsReports)
    }

    function handleEquipmentOverviewClick() {
        navigateToRoute(consoleRoutes.equipmentOverview)
    }

    function handleEquipmentInventoryClick() {
        navigateToRoute(consoleRoutes.equipmentInventory)
    }

    function handleEquipmentBookingsClick() {
        navigateToRoute(consoleRoutes.equipmentBookings)
    }

    function handleEquipmentMaintenanceClick() {
        navigateToRoute(consoleRoutes.equipmentMaintenance)
    }

    function handleEquipmentReportsClick() {
        navigateToRoute(consoleRoutes.equipmentReports)
    }

    function handleBroadcastOverviewClick() {
        navigateToRoute(consoleRoutes.broadcastOverview)
    }

    function handleBroadcastMediaClick() {
        navigateToRoute(consoleRoutes.broadcastMedia)
    }

    function handleBroadcastBroadcastClick() {
        navigateToRoute(consoleRoutes.broadcastBroadcast)
    }

    function handleCueSheetOverviewClick() {
        navigateToRoute(consoleRoutes.cueSheetOverview)
    }

    function handleCueSheetEventClick() {
        navigateToRoute(consoleRoutes.cueSheetEvent)
    }

    return (
        <div className="flex h-screen flex-col bg-[var(--background-color-primary)] text-[var(--text-color-primary)] md:grid md:grid-cols-[21.25rem_minmax(0,1fr)]">
            <Sidebar.Panel className="h-full min-h-0">
                <Sidebar.Header className="px-3 py-2">
                    <div className="size-8 shrink-0 rounded-lg bg-brand_solid" />
                    <div className="flex flex-col">
                        <span className="text-label-sm">MOC Console</span>
                        <span className="text-paragraph-xs text-tertiary">Admin Platform</span>
                    </div>
                </Sidebar.Header>

                <Sidebar.Content className="gap-2 px-0 py-4">
                    <Sidebar.Group className="w-full border-b border-[var(--border-color-secondary)] px-2 pb-4">
                        <Sidebar.GroupContent className="w-full gap-1 px-2">
                            <Sidebar.MenuItem title={"Dashboard"} icon={<LayoutGrid />} active={pathname === `/${consoleRoutes.dashboard}`} onClick={handleDashboardClick} />
                            <Sidebar.MenuItem title={"Search"} icon={<Search />} active={pathname === `/${consoleRoutes.search}`} onClick={handleSearchClick} />
                        </Sidebar.GroupContent>
                    </Sidebar.Group>

                    <Sidebar.Group className="w-full px-2">
                        <Sidebar.GroupContent className="w-full gap-2 px-2">
                            <Sidebar.MenuItem title={"Requests"} icon={<FileText />}>
                                <Sidebar.MenuItem title={"Overview"} active={pathname === `/${consoleRoutes.requestsOverview}`} onClick={handleRequestsOverviewClick} />
                                <Sidebar.MenuItem title={"All requests"} active={pathname === `/${consoleRoutes.requestsAllRequests}`} onClick={handleRequestsAllRequestsClick} />
                                <Sidebar.MenuItem title={"Archived"} active={pathname === `/${consoleRoutes.requestsArchived}`} onClick={handleRequestsArchivedClick} />
                                <Sidebar.MenuItem title={"Reports"} active={pathname === `/${consoleRoutes.requestsReports}`} onClick={handleRequestsReportsClick} />
                            </Sidebar.MenuItem>
                            <Sidebar.MenuItem title={"Equipment"} icon={<Package />}>
                                <Sidebar.MenuItem title={"Overview"} active={pathname === `/${consoleRoutes.equipmentOverview}`} onClick={handleEquipmentOverviewClick} />
                                <Sidebar.MenuItem title={"Inventory"} active={pathname === `/${consoleRoutes.equipmentInventory}`} onClick={handleEquipmentInventoryClick} />
                                <Sidebar.MenuItem title={"Bookings"} active={pathname === `/${consoleRoutes.equipmentBookings}`} onClick={handleEquipmentBookingsClick} />
                                <Sidebar.MenuItem title={"Maintenance"} active={pathname === `/${consoleRoutes.equipmentMaintenance}`} onClick={handleEquipmentMaintenanceClick} />
                                <Sidebar.MenuItem title={"Reports"} active={pathname === `/${consoleRoutes.equipmentReports}`} onClick={handleEquipmentReportsClick} />
                            </Sidebar.MenuItem>
                            <Sidebar.MenuItem title={"Broadcast"} icon={<Cast />}>
                                <Sidebar.MenuItem title={"Overview"} active={pathname === `/${consoleRoutes.broadcastOverview}`} onClick={handleBroadcastOverviewClick} />
                                <Sidebar.MenuItem title={"Media"} active={pathname === `/${consoleRoutes.broadcastMedia}`} onClick={handleBroadcastMediaClick} />
                                <Sidebar.MenuItem title={"Broadcast"} active={pathname === `/${consoleRoutes.broadcastBroadcast}`} onClick={handleBroadcastBroadcastClick} />
                            </Sidebar.MenuItem>
                            <Sidebar.MenuItem title={"Cue Sheet"} icon={<Drama />}>
                                <Sidebar.MenuItem title={"Overview"} active={pathname === `/${consoleRoutes.cueSheetOverview}`} onClick={handleCueSheetOverviewClick} />
                                <Sidebar.MenuItem title={"Event"} active={pathname === `/${consoleRoutes.cueSheetEvent}`} onClick={handleCueSheetEventClick} />
                            </Sidebar.MenuItem>
                        </Sidebar.GroupContent>
                    </Sidebar.Group>
                </Sidebar.Content>

                <Sidebar.Footer className="px-4 py-3">
                    <div className="size-8 shrink-0 rounded-lg bg-brand_solid" />
                    <div className="flex flex-col">
                        <span className="text-label-sm">MoC Member</span>
                        <span className="text-paragraph-xs text-tertiary">Super Admin</span>
                    </div>
                </Sidebar.Footer>
            </Sidebar.Panel>
            <div className="flex min-h-0 flex-1 flex-col md:h-screen">
                <TopBar />
                <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--background-color-primary)]">
                    {children}
                </main>
            </div>
        </div>
    )
}
