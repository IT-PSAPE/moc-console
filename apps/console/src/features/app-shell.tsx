import { routes } from '@/screens/console-routes'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { Breadcrumb } from '@moc/ui/components/navigation/breadcrumb'
import { Bug, CalendarCheck, FileText, LayoutGrid, ListChecks, Package, Radio, Settings, X } from 'lucide-react'
import { TopBar } from './topbar'
import { Link } from 'react-router-dom'
import { Divider } from '@moc/ui/components/display/divider'
import { CommandMenu } from '@moc/ui/components/overlays/command-menu'
import { SearchCommandMenuContent } from './search/search-command-menu'
import { SearchMenuItem } from './search/search-menu-item'
import { AccountMenu } from './account/account-menu'
import { WorkspaceSwitcher } from './workspace-switcher'
import { ReportBugModal } from './account/report-bug-modal'
import { Button } from '@moc/ui/components/controls/button'
import { SkipLink } from '@moc/ui/components/navigation/skip-link'
import { useAppShell } from './use-app-shell'


export function AppShell({ children }: { children: React.ReactNode }) {
    const { state, actions } = useAppShell()

    return (
        <CommandMenu.Root>
            <SkipLink />
            <div className="app-grid md:app-grid-desktop bg-primary text-primary">
                <Sidebar.Panel>
                    <Sidebar.Header>
                        <WorkspaceSwitcher />
                        <Button.Icon aria-label="Close navigation" variant="ghost" icon={<X />} className="md:hidden" onClick={actions.closeMobileSidebar} />
                    </Sidebar.Header>

                    <Sidebar.Content>
                        <Sidebar.Group>
                            <Sidebar.GroupContent>
                                <Sidebar.MenuItem title="Dashboard" icon={<LayoutGrid />} active={actions.isRouteActive(routes.dashboard)} render={<Link to={`/${routes.dashboard}`} />} />
                                <SearchMenuItem />
                            </Sidebar.GroupContent>
                        </Sidebar.Group>

                        <Divider className='px-2' />

                        <Sidebar.Group>
                            <Sidebar.GroupContent>
                                <Sidebar.MenuItem title="Requests" icon={<FileText />} active={actions.isRouteActive(routes.requests)} render={<Link to={`/${routes.requests}`} />} />
                                <Sidebar.MenuItem title="Equipment" icon={<Package />} active={actions.isRouteActive(routes.equipment)} render={<Link to={`/${routes.equipment}`} />} />
                                <Sidebar.MenuItem title="Bookings" icon={<CalendarCheck />} active={actions.isRouteActive(routes.bookings)} render={<Link to={`/${routes.bookings}`} />} />
                                <Sidebar.MenuItem title="Checklists" icon={<ListChecks />} active={actions.isRouteActive(routes.checklists)} render={<Link to={`/${routes.checklists}`} />} />
                                <Sidebar.MenuItem title="Streams" icon={<Radio />} active={actions.isRouteActive(routes.streams)} render={<Link to={`/${routes.streams}`} />} />
                            </Sidebar.GroupContent>
                        </Sidebar.Group>
                    </Sidebar.Content>

                    <Sidebar.Footer>
                        <div className="flex w-full flex-col gap-1">
                            <Sidebar.MenuItem title="Settings" icon={<Settings />} active={actions.isRouteActive(routes.settings)} render={<Link to={`/${routes.settings}`} />} />
                            <Sidebar.MenuItem title="Report a bug" icon={<Bug />} onClick={actions.openReportBug} />
                            <Divider className="my-1" />
                            <AccountMenu onSignOut={actions.signOut} isSigningOut={state.isSigningOut} />
                        </div>
                    </Sidebar.Footer>
                </Sidebar.Panel>

                {/* Mobile backdrop overlay */}
                {state.mobileSidebarOpen && (
                    <Button.Unstyled
                        aria-label="Close navigation"
                        className="fixed inset-0 z-40 bg-black/50 md:hidden"
                        onClick={actions.closeMobileSidebar}
                    />
                )}

                <TopBar>
                    <Breadcrumb />
                </TopBar>

                <main id="main-content" tabIndex={-1} className="area-content min-h-0 overflow-y-auto bg-[var(--background-color-primary)] outline-none">
                    {children}
                </main>
            </div>

            <SearchCommandMenuContent />
            <ReportBugModal open={state.reportBugOpen} onOpenChange={actions.setReportBugOpen} />
        </CommandMenu.Root>
    )
}
