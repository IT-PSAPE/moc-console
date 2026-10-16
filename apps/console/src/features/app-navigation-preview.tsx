import { PanelLeftOpen } from 'lucide-react'
import { Popover } from '@moc/ui/components/overlays/popover'
import { useNavigation } from './app-navigation-context'
import { WorkspaceNavigationHeader } from './workspace-navigation-header'
import { AppNavigationMenu } from './app-navigation-menu'

export function AppNavigationPreview() {
    const { actions, meta } = useNavigation()

    return (
        <Popover.Panel anchor={meta.railRef} sideOffset={4} alignOffset={12} collisionPadding={12} aria-label={`${meta.previewTitle} navigation preview`} className="h-[calc(100dvh-24px)] w-sidebar pb-2">
            <WorkspaceNavigationHeader onToggle={actions.pinPreview} toggleLabel="Pin navigation details" toggleIcon={<PanelLeftOpen />} />
            <AppNavigationMenu title={meta.previewTitle} destinations={meta.previewDestinations} onNavigate={actions.closePreview} />
        </Popover.Panel>
    )
}
