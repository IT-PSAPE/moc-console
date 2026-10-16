import { Link } from 'react-router-dom'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { Popover } from '@moc/ui/components/overlays/popover'
import { useIsLandscape } from '@moc/ui/hooks/use-is-landscape'
import { useNavigation } from './app-navigation-context'
import type { navigationSections } from './navigation-sections'
import { WorkspaceSwitcher } from './workspace-switcher'
import { AppNavigationSection } from './app-navigation-section'
import { AppNavigationPreview } from './app-navigation-preview'

export function AppNavigationRail() {
    const { state, actions, meta } = useNavigation()
    const { railRef, sections, isSigningOut, previewTriggerId } = meta
    const isLandscape = useIsLandscape()

    function renderSection(section: (typeof navigationSections)[number]) {
        const Icon = section.icon
        if (section.route) return <Sidebar.RailItem key={section.id} title={section.title} icon={<Icon />} active={state.activeSection === section.id} tone="brand" data-section={section.id} onClick={actions.selectSection} nativeButton={false} render={<Link to={`/${section.route}`} />} role="link" aria-current={state.activeSection === section.id ? 'page' : undefined} />
        return <AppNavigationSection key={section.id} section={section} />
    }

    return (
        <Sidebar.Rail ref={railRef}>
            <Popover placement="right-start" open={state.isPreviewOpen && !isLandscape} triggerId={previewTriggerId} onOpenChange={actions.changePreview}>
                <Sidebar.Group className="items-center gap-2 py-0">{sections.map(renderSection)}</Sidebar.Group>
                {!isLandscape ? <AppNavigationPreview /> : null}
            </Popover>
            <Sidebar.Footer className="mt-auto border-0 px-0 pt-3 pb-0">
                <WorkspaceSwitcher isSigningOut={isSigningOut} onEditProfile={actions.editProfile} onSignOut={actions.signOut} />
            </Sidebar.Footer>
        </Sidebar.Rail>
    )
}
