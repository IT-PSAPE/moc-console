import { routes } from '@/screens/console-routes'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { Boxes, Building2, CalendarClock, ClipboardList, Inbox, Megaphone, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { WorkspaceSwitcher } from './workspace-switcher'
import { WorkspaceNavigationHeader } from './workspace-navigation-header'

type AppNavigationProps = {
    isRouteActive: (route: string) => boolean
    isSigningOut: boolean
    onCloseMobileNavigation: () => void
    onEditProfile: () => void
    onSignOut: () => void
}

export function AppNavigation({ isRouteActive, isSigningOut, onCloseMobileNavigation, onEditProfile, onSignOut }: AppNavigationProps) {
    return (
        <>
            <WorkspaceNavigationHeader onCloseMobileNavigation={onCloseMobileNavigation} />

            <Sidebar.Content>
                <Sidebar.Group>
                    <Sidebar.GroupContent>
                        <Sidebar.MenuItem title="Requests" icon={<Inbox />} active={isRouteActive(routes.requests)} render={<Link to={`/${routes.requests}`} />} />
                        <Sidebar.MenuItem title="Streams" icon={<Radio />} active={isRouteActive(routes.streams)} render={<Link to={`/${routes.streams}`} />} />
                        <Sidebar.MenuItem title="Equipment bookings" icon={<CalendarClock />} active={isRouteActive(routes.bookings)} render={<Link to={`/${routes.bookings}`} />} />
                        <Sidebar.MenuItem title="Venues" icon={<Building2 />} active={isRouteActive(routes.venues)} render={<Link to={`/${routes.venues}`} />} />
                        <Sidebar.MenuItem title="Broadcast" icon={<Megaphone />} active={isRouteActive(routes.broadcasts)} render={<Link to={`/${routes.broadcasts}`} />} />
                        <Sidebar.MenuItem title="Checklists" icon={<ClipboardList />} active={isRouteActive(routes.checklists)} render={<Link to={`/${routes.checklists}`} />} />
                        <Sidebar.MenuItem title="Equipment" icon={<Boxes />} active={isRouteActive(routes.equipment)} render={<Link to={`/${routes.equipment}`} />} />
                    </Sidebar.GroupContent>
                </Sidebar.Group>
            </Sidebar.Content>

            <Sidebar.Footer className="pt-2">
                <WorkspaceSwitcher onEditProfile={onEditProfile} onSignOut={onSignOut} isSigningOut={isSigningOut} />
            </Sidebar.Footer>
        </>
    )
}
