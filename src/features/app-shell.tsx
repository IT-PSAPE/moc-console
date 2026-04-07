import { useEffect } from 'react'
import { routes } from '@/screens/console-routes'
import { Sidebar } from '../components/navigation/sidebar'
import { Breadcrumb } from '../components/navigation/breadcrumb'
import { Cast, Drama, FileText, LayoutGrid, Package } from 'lucide-react'
import { TopBar } from './topbar'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../components/navigation/sidebar'
import { useAuth } from '../lib/auth-context'
import { Divider } from '../components/display/divider'
import { CommandMenu } from '../components/overlays/command-menu'
import { SearchCommandMenuContent, SearchMenuItem } from './search/search-command-menu'
import { Avatar } from '@/components/display/avatar'


export function AppShell({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const { state, actions } = useSidebar()
    const { profile, role } = useAuth()

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
                                    <Sidebar.MenuItem title={"Playlists"} active={isActive(routes.broadcastPlaylists)} onClick={() => navigateToRoute(routes.broadcastPlaylists)} />
                                </Sidebar.MenuItem>
                                <Sidebar.MenuItem title={"Cue Sheet"} icon={<Drama />}>
                                    <Sidebar.MenuItem title={"Overview"} active={isActive(routes.cueSheetOverview)} onClick={() => navigateToRoute(routes.cueSheetOverview)} />
                                    <Sidebar.MenuItem title={"Events"} active={isActive(routes.cueSheetEvents)} onClick={() => navigateToRoute(routes.cueSheetEvents)} />
                                    <Sidebar.MenuItem title={"Checklists"} active={isActive(routes.cueSheetChecklists)} onClick={() => navigateToRoute(routes.cueSheetChecklists)} />
                                    <Sidebar.MenuItem title={"Templates"} active={isActive(routes.cueSheetTemplates)} onClick={() => navigateToRoute(routes.cueSheetTemplates)} />
                                </Sidebar.MenuItem>
                            </Sidebar.GroupContent>
                        </Sidebar.Group>
                    </Sidebar.Content>

                    <Sidebar.Footer>
                        {profile && <Avatar.initials name={`${profile!.name[0]}${profile!.surname[0]}`} />}
                        {!state.isCollapsed && (
                            <div className="flex flex-col">
                                <span className="text-label-sm truncate leading-none">
                                    {profile ? `${profile.name} ${profile.surname}` : "MoC Member"}
                                </span>
                                <span className="text-paragraph-xs text-quaternary truncate leading-none capitalize">
                                    {role?.name ?? "No role"}
                                </span>
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
