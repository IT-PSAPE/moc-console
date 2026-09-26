import { routes } from '@/screens/console-routes'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { NavigationList } from '@moc/ui/components/navigation/navigation-list'
import { Check, Inbox, MapPin, Megaphone, PackageCheck, Settings, Video, Wrench, X } from 'lucide-react'
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
    onSignOut: () => void
}

export function AppNavigation({ isRouteActive, isSigningOut, onCloseMobileNavigation, onEditProfile, onSignOut }: AppNavigationProps) {
    return (
        <>
            <Sidebar.Header>
                <WorkspaceSwitcher />
                <Button.Icon aria-label="Close navigation" variant="ghost" icon={<X />} className="md:hidden" onClick={onCloseMobileNavigation} />
            </Sidebar.Header>

            <Sidebar.Content>
                <Sidebar.Group>
                    <Sidebar.GroupContent>
                        <Sidebar.MenuItem title="Requests" icon={<Inbox />} active={isRouteActive(routes.requests)} render={<Link to={`/${routes.requests}`} />} />
                        <Sidebar.MenuItem title="Equipment bookings" icon={<PackageCheck />} active={isRouteActive(routes.bookings)} render={<Link to={`/${routes.bookings}`} />} />
                        <Sidebar.MenuItem title="Venues" icon={<MapPin />} active={isRouteActive(routes.venues)} render={<Link to={`/${routes.venues}`} />} />
                        <Sidebar.MenuItem title="Broadcast" icon={<Megaphone />} active={isRouteActive(routes.broadcasts)} render={<Link to={`/${routes.broadcasts}`} />} />
                        <Sidebar.MenuItem title="Streams" icon={<Video />} active={isRouteActive(routes.streams)} render={<Link to={`/${routes.streams}`} />} />
                        <Sidebar.MenuItem title="Checklists" icon={<Check />} active={isRouteActive(routes.checklists)} render={<Link to={`/${routes.checklists}`} />} />
                        <Sidebar.MenuItem title="Equipment" icon={<Wrench />} active={isRouteActive(routes.equipment)} render={<Link to={`/${routes.equipment}`} />} />
                    </Sidebar.GroupContent>
                </Sidebar.Group>
            </Sidebar.Content>

            <Sidebar.Footer>
                <div className="flex w-full flex-col">
                    <NavigationList.Root>
                        <Sidebar.MenuItem title="Settings" icon={<Settings />} active={isRouteActive(routes.settings)} render={<Link to={`/${routes.settings}`} />} />
                    </NavigationList.Root>
                    <Divider className="my-1" />
                    <AccountMenu onEditProfile={onEditProfile} onSignOut={onSignOut} isSigningOut={isSigningOut} />
                </div>
            </Sidebar.Footer>
        </>
    )
}
