import { useEffect, type ReactNode } from 'react'
import { routes } from '@/screens/console-routes'
import { Sidebar } from '../navigation/sidebar'
import { Breadcrumb } from '../navigation/breadcrumb'
import { Cast, Drama, FileText, LayoutGrid, Package, Search } from 'lucide-react'
import { TopBar } from './topbar'
import { useLocation, useNavigate } from 'react-router-dom'
import { SidebarProvider, useSidebar } from '../navigation/sidebar'
import { Divider } from '../display/divider'
import { CommandMenu, useCommandMenu } from '../overlays/command-menu'

type AppShellProps = {
    children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
    return (
        <SidebarProvider>
            <AppShellInner>{children}</AppShellInner>
        </SidebarProvider>
    )
}

function AppShellInner({ children }: AppShellProps) {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const { state, actions } = useSidebar()

    // Close mobile sidebar on route change
    useEffect(() => {
        actions.closeMobile()
    }, [pathname, actions])

    function navigateToRoute(route: string) {
        navigate(`/${route}`)
    }

    function isActive(route: string) {
        return pathname === `/${route}`
    }

    return (
        <CommandMenu.Root>
            <div className="app-grid md:app-grid-desktop bg-primary text-primary">
                <Sidebar.Panel>
                    <Sidebar.Header>
                        <div className="size-9 shrink-0 rounded-lg bg-brand_solid" />
                        {!state.isCollapsed && (
                            <div className="flex flex-col">
                                <span className="text-label-sm truncate leading-none">MOC Console</span>
                                <span className="text-paragraph-xs text-quaternary truncate leading-none">Admin Platform</span>
                            </div>
                        )}
                    </Sidebar.Header>

                    <Sidebar.Content>
                        <Sidebar.Group>
                            <Sidebar.GroupContent>
                                <Sidebar.MenuItem title={"Dashboard"} icon={<LayoutGrid />} active={isActive(routes.dashboard)} onClick={() => navigateToRoute(routes.dashboard)} />
                                <SearchMenuItem />
                            </Sidebar.GroupContent>
                        </Sidebar.Group>

                        <Divider className='px-2' />

                        <Sidebar.Group>
                            <Sidebar.GroupContent>
                                <Sidebar.MenuItem title={"Requests"} icon={<FileText />}>
                                    <Sidebar.MenuItem title={"Overview"} active={isActive(routes.requestsOverview)} onClick={() => navigateToRoute(routes.requestsOverview)} />
                                    <Sidebar.MenuItem title={"All requests"} active={isActive(routes.requestsAllRequests)} onClick={() => navigateToRoute(routes.requestsAllRequests)} />
                                    <Sidebar.MenuItem title={"Archived"} active={isActive(routes.requestsArchived)} onClick={() => navigateToRoute(routes.requestsArchived)} />
                                    <Sidebar.MenuItem title={"Reports"} active={isActive(routes.requestsReports)} onClick={() => navigateToRoute(routes.requestsReports)} />
                                </Sidebar.MenuItem>
                                <Sidebar.MenuItem title={"Equipment"} icon={<Package />}>
                                    <Sidebar.MenuItem title={"Overview"} active={isActive(routes.equipmentOverview)} onClick={() => navigateToRoute(routes.equipmentOverview)} />
                                    <Sidebar.MenuItem title={"Inventory"} active={isActive(routes.equipmentInventory)} onClick={() => navigateToRoute(routes.equipmentInventory)} />
                                    <Sidebar.MenuItem title={"Bookings"} active={isActive(routes.equipmentBookings)} onClick={() => navigateToRoute(routes.equipmentBookings)} />
                                    <Sidebar.MenuItem title={"Maintenance"} active={isActive(routes.equipmentMaintenance)} onClick={() => navigateToRoute(routes.equipmentMaintenance)} />
                                    <Sidebar.MenuItem title={"Reports"} active={isActive(routes.equipmentReports)} onClick={() => navigateToRoute(routes.equipmentReports)} />
                                </Sidebar.MenuItem>
                                <Sidebar.MenuItem title={"Broadcast"} icon={<Cast />}>
                                    <Sidebar.MenuItem title={"Overview"} active={isActive(routes.broadcastOverview)} onClick={() => navigateToRoute(routes.broadcastOverview)} />
                                    <Sidebar.MenuItem title={"Media"} active={isActive(routes.broadcastMedia)} onClick={() => navigateToRoute(routes.broadcastMedia)} />
                                    <Sidebar.MenuItem title={"Broadcast"} active={isActive(routes.broadcastBroadcast)} onClick={() => navigateToRoute(routes.broadcastBroadcast)} />
                                </Sidebar.MenuItem>
                                <Sidebar.MenuItem title={"Cue Sheet"} icon={<Drama />}>
                                    <Sidebar.MenuItem title={"Overview"} active={isActive(routes.cueSheetOverview)} onClick={() => navigateToRoute(routes.cueSheetOverview)} />
                                    <Sidebar.MenuItem title={"Checklist"} active={isActive(routes.cueSheetChecklist)} onClick={() => navigateToRoute(routes.cueSheetChecklist)} />
                                    <Sidebar.MenuItem title={"Event"} active={isActive(routes.cueSheetEvent)} onClick={() => navigateToRoute(routes.cueSheetEvent)} />
                                </Sidebar.MenuItem>
                            </Sidebar.GroupContent>
                        </Sidebar.Group>
                    </Sidebar.Content>

                    <Sidebar.Footer>
                        <div className="size-9 shrink-0 rounded-lg bg-brand_solid" />
                        {!state.isCollapsed && (
                            <div className="flex flex-col">
                                <span className="text-label-sm truncate leading-none">MoC Member</span>
                                <span className="text-paragraph-xs text-quaternary truncate leading-none">Super Admin</span>
                            </div>
                        )}
                    </Sidebar.Footer>
                </Sidebar.Panel>

                {/* Mobile backdrop overlay */}
                {state.isMobileOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 md:hidden"
                        onClick={actions.closeMobile}
                        aria-hidden="true"
                    />
                )}

                <TopBar>
                    <Breadcrumb.Root />
                </TopBar>

                <main className="area-content min-h-0 overflow-y-auto bg-[var(--background-color-primary)]">
                    {children}
                </main>
            </div>

            <SearchCommandMenuContent />
        </CommandMenu.Root>
    )
}

// ─── Search Command Menu ─────────────────────────────────

function SearchMenuItem() {
    const { actions } = useCommandMenu()
    return <Sidebar.MenuItem title={"Search"} icon={<Search />} onClick={actions.open} />
}

const searchablePages = [
    { group: 'General', label: 'Dashboard', route: routes.dashboard, icon: <LayoutGrid className="size-4" /> },
    { group: 'Requests', label: 'Requests Overview', route: routes.requestsOverview, icon: <FileText className="size-4" /> },
    { group: 'Requests', label: 'All Requests', route: routes.requestsAllRequests, icon: <FileText className="size-4" /> },
    { group: 'Requests', label: 'Archived Requests', route: routes.requestsArchived, icon: <FileText className="size-4" /> },
    { group: 'Requests', label: 'Request Reports', route: routes.requestsReports, icon: <FileText className="size-4" /> },
    { group: 'Equipment', label: 'Equipment Overview', route: routes.equipmentOverview, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Inventory', route: routes.equipmentInventory, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Bookings', route: routes.equipmentBookings, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Maintenance', route: routes.equipmentMaintenance, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Equipment Reports', route: routes.equipmentReports, icon: <Package className="size-4" /> },
    { group: 'Broadcast', label: 'Broadcast Overview', route: routes.broadcastOverview, icon: <Cast className="size-4" /> },
    { group: 'Broadcast', label: 'Media', route: routes.broadcastMedia, icon: <Cast className="size-4" /> },
    { group: 'Broadcast', label: 'Broadcast', route: routes.broadcastBroadcast, icon: <Cast className="size-4" /> },
    { group: 'Cue Sheet', label: 'Cue Sheet Overview', route: routes.cueSheetOverview, icon: <Drama className="size-4" /> },
    { group: 'Cue Sheet', label: 'Checklist', route: routes.cueSheetChecklist, icon: <Drama className="size-4" /> },
    { group: 'Cue Sheet', label: 'Event', route: routes.cueSheetEvent, icon: <Drama className="size-4" /> },
] as const

function SearchCommandMenuContent() {
    const navigate = useNavigate()
    const { state } = useCommandMenu()
    const query = state.search.toLowerCase()

    const filtered = query
        ? searchablePages.filter(page => page.label.toLowerCase().includes(query) || page.group.toLowerCase().includes(query))
        : searchablePages

    const groups = filtered.reduce<Record<string, typeof filtered>>((acc, page) => {
        const group = page.group
        if (!acc[group]) {
            acc[group] = []
        }
        acc[group].push(page)
        return acc
    }, {})

    return (
        <CommandMenu.Portal>
            <CommandMenu.Backdrop />
            <CommandMenu.Panel>
                <CommandMenu.Input placeholder="Search pages..." />
                <CommandMenu.List>
                    {filtered.length === 0 && <CommandMenu.Empty />}
                    {Object.entries(groups).map(([group, pages]) => (
                        <CommandMenu.Group key={group} heading={group}>
                            {pages.map(page => (
                                <CommandMenu.Item key={page.route} value={page.label} onSelect={() => navigate(`/${page.route}`)}>
                                    {page.icon}
                                    {page.label}
                                </CommandMenu.Item>
                            ))}
                        </CommandMenu.Group>
                    ))}
                </CommandMenu.List>
            </CommandMenu.Panel>
        </CommandMenu.Portal>
    )
}
