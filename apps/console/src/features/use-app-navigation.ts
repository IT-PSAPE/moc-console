import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '@moc/ui/components/navigation/sidebar'
import type { PopoverChangeEventDetails } from '@moc/ui/components/overlays/popover'
import { useWorkspace } from '@/lib/workspace-context'
import { isNavigationSection, navigationDestinations, navigationEntryRoute, navigationSectionForPath, navigationSections, type NavigationSection } from './navigation-sections'

export function useAppNavigation(canManageScheduledMessages: boolean) {
    const { pathname, key: locationKey } = useLocation()
    const navigate = useNavigate()
    const { role } = useWorkspace()
    const sidebar = useSidebar()
    const railRef = useRef<HTMLElement | null>(null)
    const activeSection = navigationSectionForPath(pathname)
    const canManageTelegram = role?.can_manage_roles === true
    const canManageMembers = role?.can_update === true || role?.can_manage_roles === true
    const access = { canManageMembers, canManageScheduledMessages, canManageTelegram, canManageQuotes: role?.can_manage_roles === true }
    const [preview, setPreview] = useState<{ section: NavigationSection; locationKey: string; isOpen: boolean } | null>(null)

    if (preview && preview.locationKey !== locationKey) setPreview(null)

    function changePreview(open: boolean, eventDetails: PopoverChangeEventDetails): void {
        if (!open) {
            closePreview()
            return
        }
        const section = eventDetails.trigger?.getAttribute('data-section')
        if (section && isNavigationSection(section)) setPreview({ section, locationKey, isOpen: true })
    }

    function closePreview(): void {
        setPreview(current => current ? { ...current, isOpen: false } : null)
    }

    function openPreviewWithKeyboard(event: KeyboardEvent<HTMLElement>): void {
        const section = event.currentTarget.dataset.section
        if (event.key !== 'ArrowRight' || !isNavigationSection(section)) return
        event.preventDefault()
        setPreview({ section, locationKey, isOpen: true })
    }

    function pinPreview(): void {
        if (preview) pinSection(preview.section)
    }

    function pinSection(section: NavigationSection): void {
        const entryRoute = navigationEntryRoute(section, access)
        if (!entryRoute) return
        if (activeSection !== section) navigate(`/${entryRoute}`)
        closePreview()
        sidebar.actions.expand()
    }

    function selectSection(event: MouseEvent<HTMLElement>): void {
        const section = event.currentTarget.dataset.section
        if (!isNavigationSection(section)) return
        closePreview()
        if (navigationSections.find(destination => destination.id === section)?.route) {
            sidebar.actions.closeLandscape()
            return
        }
        const entryRoute = navigationEntryRoute(section, access)
        if (!entryRoute) return
        navigate(`/${entryRoute}`)
        sidebar.actions.closeLandscape()
    }

    function isRouteActive(route: string): boolean {
        return pathname === `/${route}` || pathname.startsWith(`/${route}/`)
    }

    return {
        state: { activeSection, isCollapsed: sidebar.state.isCollapsed, isPreviewOpen: sidebar.state.isCollapsed && preview?.isOpen === true },
        actions: { selectSection, pinPreview, changePreview, closePreview, openPreviewWithKeyboard, toggleCollapsed: sidebar.actions.toggleCollapsed, isRouteActive },
        meta: {
            railRef,
            previewTriggerId: preview ? `navigation-preview-${preview.section}` : null,
            previewTitle: navigationSections.find(section => section.id === preview?.section)?.title ?? 'Navigation',
            previewDestinations: preview ? navigationDestinations(preview.section, access) : [],
            sections: navigationSections.filter(section => section.id !== 'communications' || canManageScheduledMessages || canManageTelegram),
            title: navigationSections.find(section => section.id === activeSection)?.title ?? 'Navigation',
            destinations: activeSection ? navigationDestinations(activeSection, access) : [],
        },
    }
}
