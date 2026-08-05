import { routes } from '@/screens/console-routes'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { NavigationList } from '@moc/ui/components/navigation/navigation-list'
import { Bug, CalendarCheck, FileText, LayoutGrid, ListChecks, Package, Radio, Settings, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Divider } from '@moc/ui/components/display/divider'
import { AccountMenu } from './account/account-menu'
import { WorkspaceSwitcher } from './workspace-switcher'
import { Button } from '@moc/ui/components/controls/button'

type AppNavigationProps = {
    isRouteActive: (route: string) => boolean
    isSigningOut: boolean
    onCloseMobileNavigation: () => void
    onEditProfile: () => void
    onReportBug: () => void
    onSignOut: () => void
}

export function AppNavigation({ isRouteActive, isSigningOut, onCloseMobileNavigation, onEditProfile, onReportBug, onSignOut }: AppNavigationProps) {
    return (
        <>
            <Sidebar.Header>
                <WorkspaceSwitcher />
                <Button.Icon aria-label="Close navigation" variant="ghost" icon={<X />} className="md:hidden" onClick={onCloseMobileNavigation} />
            </Sidebar.Header>

            <Sidebar.Content>
                <Sidebar.Group>
                    <Sidebar.GroupContent>
                        <Sidebar.MenuItem title="Dashboard" icon={<LayoutGrid />} active={isRouteActive(routes.dashboard)} render={<Link to={`/${routes.dashboard}`} />} />
                    </Sidebar.GroupContent>
                </Sidebar.Group>

                <Divider className="px-2" />

                <Sidebar.Group>
                    <Sidebar.GroupContent>
                        <Sidebar.MenuItem title="Requests" icon={<FileText />} active={isRouteActive(routes.requests)} render={<Link to={`/${routes.requests}`} />} />
                        <Sidebar.MenuItem title="Bookings" icon={<CalendarCheck />} active={isRouteActive(routes.bookings)} render={<Link to={`/${routes.bookings}`} />} />
                        <Sidebar.MenuItem title="Streams" icon={<Radio />} active={isRouteActive(routes.streams)} render={<Link to={`/${routes.streams}`} />} />
                        <Sidebar.MenuItem title="Checklists" icon={<ListChecks />} active={isRouteActive(routes.checklists)} render={<Link to={`/${routes.checklists}`} />} />
                        <Sidebar.MenuItem title="Equipment" icon={<Package />} active={isRouteActive(routes.equipment)} render={<Link to={`/${routes.equipment}`} />} />
                    </Sidebar.GroupContent>
                </Sidebar.Group>
            </Sidebar.Content>

            <Sidebar.Footer>
                <div className="flex w-full flex-col">
                    <NavigationList.Root>
                        <Sidebar.MenuItem title="Settings" icon={<Settings />} active={isRouteActive(routes.settings)} render={<Link to={`/${routes.settings}`} />} />
                        <Sidebar.MenuItem title="Report a bug" icon={<Bug />} onClick={onReportBug} />
                    </NavigationList.Root>
                    <Divider className="my-1" />
                    <AccountMenu onEditProfile={onEditProfile} onSignOut={onSignOut} isSigningOut={isSigningOut} />
                </div>
            </Sidebar.Footer>
        </>
    )
}
