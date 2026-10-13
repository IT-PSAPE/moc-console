import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { useIsMobile } from '@moc/ui/hooks/use-is-mobile'
import { useNavigation } from './app-navigation-context'
import type { navigationSections } from './navigation-sections'
import { WorkspaceSwitcher } from './workspace-switcher'

export function AppNavigationRail() {
    const { state, actions, meta } = useNavigation()
    const isMobile = useIsMobile()
    const collapseLabel = isMobile ? 'Close navigation' : state.isCollapsed ? 'Expand navigation details' : 'Collapse navigation details'

    function handleLogoClick(): void {
        if (isMobile) actions.closeMobile()
        else actions.toggleCollapsed()
    }

    function renderSection(section: (typeof navigationSections)[number]) {
        const Icon = section.icon
        return <Sidebar.RailItem key={section.id} title={section.title} icon={<Icon />} active={state.activeSection === section.id} tone="brand" data-section={section.id} onClick={actions.selectSection} aria-pressed={state.activeSection === section.id} aria-controls="secondary-navigation" />
    }

    return (
        <Sidebar.Rail>
            <Sidebar.RailItem title={collapseLabel} icon={
                <span className="relative flex size-7 items-center justify-center">
                    <img src="/logo.svg" alt="" className="size-7 rounded-md bg-brand_solid p-0.5 transition-opacity group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0" />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100" aria-hidden="true">
                        {isMobile ? <X /> : state.isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                    </span>
                </span>
            } onClick={handleLogoClick} aria-expanded={isMobile || !state.isCollapsed} aria-controls="secondary-navigation" className="group/logo" />
            <Sidebar.Group className="items-center gap-2 py-0">{meta.sections.map(renderSection)}</Sidebar.Group>
            <Sidebar.Footer className="mt-auto border-0 px-0 pt-3">
                <WorkspaceSwitcher isSigningOut={meta.isSigningOut} onEditProfile={actions.editProfile} onSignOut={actions.signOut} />
            </Sidebar.Footer>
        </Sidebar.Rail>
    )
}
