import { Link } from 'react-router-dom'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { useNavigation } from './app-navigation-context'
import type { NavigationDestination } from './navigation-sections'

type AppNavigationMenuProps = {
    title: string
    destinations: NavigationDestination[]
    onNavigate: () => void
}

export function AppNavigationMenu({ title, destinations, onNavigate }: AppNavigationMenuProps) {
    const { actions } = useNavigation()

    function renderDestination(destination: NavigationDestination) {
        const Icon = destination.icon
        return <Sidebar.MenuItem key={destination.route} title={destination.title} icon={<Icon />} active={actions.isRouteActive(destination.route)} onClick={onNavigate} render={<Link to={`/${destination.route}`} />} />
    }

    return (
        <Sidebar.Content className="pt-0">
            <Sidebar.Group className="pt-0">
                <Sidebar.GroupTitle title={title} />
                <Sidebar.GroupContent>{destinations.map(renderDestination)}</Sidebar.GroupContent>
            </Sidebar.Group>
        </Sidebar.Content>
    )
}
