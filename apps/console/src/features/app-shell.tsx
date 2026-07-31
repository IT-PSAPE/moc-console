import { useEffect } from 'react'
import { routes } from '@/screens/console-routes'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { Breadcrumb } from '@moc/ui/components/navigation/breadcrumb'
import { CalendarCheck, FileText, LayoutGrid, ListChecks, Package, Radio } from 'lucide-react'
import { TopBar } from './topbar'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '@moc/ui/components/navigation/sidebar'
import { useAuth } from '../lib/auth-context'
import { Divider } from '@moc/ui/components/display/divider'
import { CommandMenu } from '@moc/ui/components/overlays/command-menu'
import { SearchCommandMenuContent, SearchMenuItem } from './search/search-command-menu'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useCallback, useState } from 'react'
import { ProfilePopover } from './account/profile-popover'


export function AppShell({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const { state, actions } = useSidebar()
    const { signOut } = useAuth()
    const { toast } = useFeedback()
    const [isSigningOut, setIsSigningOut] = useState(false)

    // Close mobile sidebar on route change
    useEffect(() => {
        actions.closeMobile()
    }, [pathname, actions])

    function navigateToRoute(route: string) {
        navigate(`/${route}`)
    }

    // A section stays active on its detail pages too (e.g. /requests/:id).
    function isActive(route: string) {
        return pathname === `/${route}` || pathname.startsWith(`/${route}/`)
    }

    const handleSignOut = useCallback(async () => {
        if (isSigningOut) return
        setIsSigningOut(true)
        try {
            const { error } = await signOut()
            actions.closeMobile()
            if (error) {
                toast({ title: 'Logged out locally', description: error.message, variant: 'info' })
            }
        } finally {
            window.location.replace(`/${routes.login}`)
        }
    }, [actions, isSigningOut, signOut, toast])

    return (
        <CommandMenu>
            <div className="app-grid md:app-grid-desktop bg-primary text-primary">
                <Sidebar.Panel>
                    <Sidebar.Header>
                        <div className="size-8 shrink-0 rounded-xl bg-brand_solid" >
                            <img src="/logo.svg" alt="" className='w-full h-full' />
                        </div>
                        {!state.isCollapsed && (
                            <div className="flex flex-col">
                                <span className="label-sm truncate leading-none">MOC Console</span>
                                <span className="paragraph-xs text-quaternary truncate leading-none">Admin Platform</span>
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
                                <Sidebar.MenuItem title={"Requests"} icon={<FileText />} active={isActive(routes.requests)} onClick={() => navigateToRoute(routes.requests)} />
                                <Sidebar.MenuItem title={"Equipment"} icon={<Package />} active={isActive(routes.equipment)} onClick={() => navigateToRoute(routes.equipment)} />
                                <Sidebar.MenuItem title={"Bookings"} icon={<CalendarCheck />} active={isActive(routes.bookings)} onClick={() => navigateToRoute(routes.bookings)} />
                                <Sidebar.MenuItem title={"Checklists"} icon={<ListChecks />} active={isActive(routes.checklists)} onClick={() => navigateToRoute(routes.checklists)} />
                                <Sidebar.MenuItem title={"Streams"} icon={<Radio />} active={isActive(routes.streams)} onClick={() => navigateToRoute(routes.streams)} />
                            </Sidebar.GroupContent>
                        </Sidebar.Group>
                    </Sidebar.Content>

                    <Sidebar.Footer>
                        <ProfilePopover onSignOut={handleSignOut} isSigningOut={isSigningOut} />
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
                    <Breadcrumb />
                </TopBar>

                <main className="area-content min-h-0 overflow-y-auto bg-[var(--background-color-primary)]">
                    {children}
                </main>
            </div>

            <SearchCommandMenuContent />
        </CommandMenu>
    )
}
