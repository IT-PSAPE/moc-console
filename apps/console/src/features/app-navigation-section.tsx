import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { Popover } from '@moc/ui/components/overlays/popover'
import { useIsLandscape } from '@moc/ui/hooks/use-is-landscape'
import { useNavigation } from './app-navigation-context'
import type { navigationSections } from './navigation-sections'

export function AppNavigationSection({ section }: { section: (typeof navigationSections)[number] }) {
    const { state, actions } = useNavigation()
    const isLandscape = useIsLandscape()
    const Icon = section.icon

    if (!state.isCollapsed || isLandscape) return <Sidebar.RailItem title={section.title} icon={<Icon />} active={state.activeSection === section.id} tone="brand" data-section={section.id} onClick={actions.selectSection} aria-pressed={state.activeSection === section.id} aria-controls="secondary-navigation" />

    return (
        <Popover.Trigger id={`navigation-preview-${section.id}`} openOnHover delay={state.isPreviewOpen ? 0 : 180} closeDelay={350}>
            <Sidebar.RailButton title={section.title} icon={<Icon />} active={state.activeSection === section.id} tone="brand" data-section={section.id} onClick={actions.selectSection} onKeyDown={actions.openPreviewWithKeyboard} aria-pressed={state.activeSection === section.id} />
        </Popover.Trigger>
    )
}
