import { routes } from '@/screens/console-routes'
import { Packages, Building, TaskList, ViewGrid, Megaphone, Message, ChatLines, Quote, AntennaSignal, SendDiagonal, Group, Suitcase, Movie } from 'iconoir-react'

export type NavigationSection = 'overview' | 'work' | 'production' | 'communications' | 'people'
export type NavigationDestination = { title: string; route: string; icon: typeof ViewGrid }
export type NavigationAccess = { canManageMembers: boolean; canManageScheduledMessages: boolean; canManageTelegram: boolean; canManageQuotes: boolean }
type PrimaryDestination = { id: NavigationSection; title: string; icon: typeof ViewGrid; route?: string }

export const navigationSections: PrimaryDestination[] = [
    { id: 'overview', title: 'Overview', icon: ViewGrid, route: routes.overview },
    { id: 'work', title: 'Work', icon: Suitcase, route: routes.work },
    { id: 'production', title: 'Production', icon: Movie },
    { id: 'communications', title: 'Communications', icon: ChatLines },
    { id: 'people', title: 'People & resources', icon: Group },
]
const productionDestinations: NavigationDestination[] = [
    { title: 'Streams', route: routes.streams, icon: AntennaSignal },
    { title: 'Broadcast', route: routes.broadcasts, icon: Megaphone },
    { title: 'Checklists', route: routes.checklists, icon: TaskList },
]
const communicationDestinations: NavigationDestination[] = [
    { title: 'Messages', route: routes.scheduledMessages, icon: Message },
    { title: 'Telegram', route: routes.telegram, icon: SendDiagonal },
]
const members: NavigationDestination = { title: 'Members', route: routes.members, icon: Group }
const resources: NavigationDestination[] = [
    { title: 'Equipment', route: routes.equipment, icon: Packages },
    { title: 'Venues', route: routes.venueCatalog, icon: Building },
]
const dailyQuotes: NavigationDestination = { title: 'Daily quotes', route: routes.dailyQuotes, icon: Quote }

export function navigationDestinations(section: NavigationSection, access: NavigationAccess): NavigationDestination[] {
    if (section === 'overview' || section === 'work') return []
    if (section === 'production') return productionDestinations
    if (section === 'communications') return communicationDestinations.filter(destination => destination.route === routes.telegram ? access.canManageTelegram : access.canManageScheduledMessages)
    return [...(access.canManageMembers ? [members] : []), ...resources, ...(access.canManageQuotes ? [dailyQuotes] : [])]
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
    if ([members, ...resources, dailyQuotes].some(destination => destination.route === route)) return 'people'
    return null
}
