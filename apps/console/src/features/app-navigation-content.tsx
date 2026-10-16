import { PanelLeftClose, X } from 'lucide-react'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { useIsLandscape } from '@moc/ui/hooks/use-is-landscape'
import { useNavigation } from './app-navigation-context'
import { WorkspaceNavigationHeader } from './workspace-navigation-header'
import { AppNavigationMenu } from './app-navigation-menu'

export function AppNavigationContent() {
    const { actions, meta } = useNavigation()
    const isLandscape = useIsLandscape()
    if (meta.destinations.length === 0 && !isLandscape) return null

    return (
        <Sidebar.Secondary id="secondary-navigation" aria-label={`${meta.title} navigation`}>
            <WorkspaceNavigationHeader onToggle={isLandscape ? actions.closeLandscape : actions.toggleCollapsed} toggleLabel={isLandscape ? 'Close navigation' : 'Collapse navigation details'} toggleIcon={isLandscape ? <X /> : <PanelLeftClose />} />
            {meta.destinations.length > 0 ? <AppNavigationMenu title={meta.title} destinations={meta.destinations} onNavigate={actions.closeLandscape} /> : null}
        </Sidebar.Secondary>
    )
}
