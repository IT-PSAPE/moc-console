import { useState, type MouseEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useSidebar } from '@moc/ui/components/navigation/sidebar'
import { useWorkspace } from '@/lib/workspace-context'
import { isNavigationSection, navigationDestinations, navigationSectionForPath, navigationSections, type NavigationSection } from './navigation-sections'

export function useAppNavigation(canManageScheduledMessages: boolean) {
    const { pathname } = useLocation()
    const { role } = useWorkspace()
    const sidebar = useSidebar()
    const [selection, setSelection] = useState<{ pathname: string; section: NavigationSection }>({ pathname, section: navigationSectionForPath(pathname) ?? 'work' })
    const activeSection = selection.pathname === pathname ? selection.section : navigationSectionForPath(pathname) ?? selection.section
    if (selection.pathname !== pathname) setSelection({ pathname, section: activeSection })
    const canManageMembers = role?.can_update === true || role?.can_manage_roles === true

    function selectSection(event: MouseEvent<HTMLButtonElement>): void {
        const section = event.currentTarget.dataset.section
        if (!isNavigationSection(section)) return
        setSelection({ pathname, section })
        sidebar.actions.expand()
    }

    function isRouteActive(route: string): boolean {
        return pathname === `/${route}` || pathname.startsWith(`/${route}/`)
    }

    return {
        state: { activeSection, isCollapsed: sidebar.state.isCollapsed },
        actions: { selectSection, toggleCollapsed: sidebar.actions.toggleCollapsed, isRouteActive },
        meta: { sections: navigationSections, title: navigationSections.find(section => section.id === activeSection)?.title ?? 'Work', destinations: navigationDestinations(activeSection, { canManageMembers, canManageScheduledMessages }) },
    }
}
