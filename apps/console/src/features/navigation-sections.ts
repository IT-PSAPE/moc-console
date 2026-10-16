import { routes } from '@/screens/console-routes'
import { Boxes, Building2, ClipboardList, LayoutDashboard, Megaphone, MessageSquare, MessagesSquare, Radio, Send, UsersRound, BriefcaseBusiness, Clapperboard, type LucideIcon } from 'lucide-react'

export type NavigationSection = 'overview' | 'work' | 'production' | 'communications' | 'people'
export type NavigationDestination = { title: string; route: string; icon: LucideIcon }
export type NavigationAccess = { canManageMembers: boolean; canManageScheduledMessages: boolean; canManageTelegram: boolean }
type PrimaryDestination = { id: NavigationSection; title: string; icon: LucideIcon; route?: string }

export const navigationSections: PrimaryDestination[] = [
    { id: 'overview', title: 'Overview', icon: LayoutDashboard, route: routes.overview },
    { id: 'work', title: 'Work', icon: BriefcaseBusiness, route: routes.work },
    { id: 'production', title: 'Production', icon: Clapperboard },
    { id: 'communications', title: 'Communications', icon: MessagesSquare },
    { id: 'people', title: 'People & resources', icon: UsersRound },
]
const productionDestinations: NavigationDestination[] = [
    { title: 'Streams', route: routes.streams, icon: Radio },
    { title: 'Broadcast', route: routes.broadcasts, icon: Megaphone },
    { title: 'Checklists', route: routes.checklists, icon: ClipboardList },
]
const communicationDestinations: NavigationDestination[] = [
    { title: 'Messages', route: routes.scheduledMessages, icon: MessageSquare },
    { title: 'Telegram', route: routes.telegram, icon: Send },
]
const members: NavigationDestination = { title: 'Members', route: routes.members, icon: UsersRound }
const resources: NavigationDestination[] = [
    { title: 'Equipment', route: routes.equipment, icon: Boxes },
    { title: 'Venues', route: routes.venueCatalog, icon: Building2 },
]

export function navigationDestinations(section: NavigationSection, access: NavigationAccess): NavigationDestination[] {
    if (section === 'overview' || section === 'work') return []
    if (section === 'production') return productionDestinations
    if (section === 'communications') return communicationDestinations.filter(destination => destination.route === routes.telegram ? access.canManageTelegram : access.canManageScheduledMessages)
    return access.canManageMembers ? [members, ...resources] : resources
}

export function navigationEntryRoute(section: NavigationSection, access: NavigationAccess): string | null {
    return navigationSections.find(destination => destination.id === section)?.route
        ?? navigationDestinations(section, access)[0]?.route
        ?? null
}

export function isNavigationSection(value: string | undefined): value is NavigationSection {
    return navigationSections.some(section => section.id === value)
}

export function navigationSectionForPath(pathname: string): NavigationSection | null {
    const route = pathname.split('/')[1]
    if (route === routes.overview) return 'overview'
    if ([routes.work, routes.schedule, routes.requests, routes.bookings, routes.venues].some(destination => destination === route)) return 'work'
    if (productionDestinations.some(destination => destination.route === route)) return 'production'
    if (communicationDestinations.some(destination => destination.route === route)) return 'communications'
    if ([members, ...resources].some(destination => destination.route === route)) return 'people'
    return null
}
