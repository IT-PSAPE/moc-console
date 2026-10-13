import { Link } from 'react-router-dom'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { useNavigation } from './app-navigation-context'
import type { NavigationDestination } from './navigation-sections'
import { WorkspaceNavigationHeader } from './workspace-navigation-header'

export function AppNavigationContent() {
    const { actions, meta } = useNavigation()

    function renderDestination(destination: NavigationDestination) {
        const Icon = destination.icon
        return <Sidebar.MenuItem key={destination.route} title={destination.title} icon={<Icon />} active={actions.isRouteActive(destination.route)} render={<Link to={`/${destination.route}`} />} />
    }

    return (
        <Sidebar.Secondary id="secondary-navigation" aria-label={`${meta.title} navigation`}>
            <WorkspaceNavigationHeader />
            <Sidebar.Content>
                <Sidebar.Group>
                    <Sidebar.GroupTitle title={meta.title} />
                    <Sidebar.GroupContent>{meta.destinations.map(renderDestination)}</Sidebar.GroupContent>
                </Sidebar.Group>
            </Sidebar.Content>
        </Sidebar.Secondary>
    )
}
