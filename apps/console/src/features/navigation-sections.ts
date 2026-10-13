import { routes } from '@/screens/console-routes'
import { Boxes, Building2, CalendarClock, CalendarDays, ClipboardList, Inbox, Megaphone, MessageSquare, Radio, UsersRound, BriefcaseBusiness, Clapperboard, type LucideIcon } from 'lucide-react'

export type NavigationSection = 'work' | 'production' | 'people'
export type NavigationDestination = { title: string; route: string; icon: LucideIcon }
export type NavigationAccess = { canManageMembers: boolean; canManageScheduledMessages: boolean }

export const navigationSections: { id: NavigationSection; title: string; icon: LucideIcon }[] = [
    { id: 'work', title: 'Work', icon: BriefcaseBusiness },
    { id: 'production', title: 'Production', icon: Clapperboard },
    { id: 'people', title: 'People & resources', icon: UsersRound },
]
const workDestinations: NavigationDestination[] = [
    { title: 'Requests', route: routes.requests, icon: Inbox },
    { title: 'Equipment bookings', route: routes.bookings, icon: CalendarClock },
    { title: 'Venues', route: routes.venues, icon: Building2 },
    { title: 'Checklists', route: routes.checklists, icon: ClipboardList },
    { title: 'Schedule', route: routes.schedule, icon: CalendarDays },
]
const productionDestinations: NavigationDestination[] = [
    { title: 'Streams', route: routes.streams, icon: Radio },
    { title: 'Broadcast', route: routes.broadcasts, icon: Megaphone },
]
const scheduledMessages: NavigationDestination = { title: 'Scheduled messages', route: routes.scheduledMessages, icon: MessageSquare }
const members: NavigationDestination = { title: 'Members', route: routes.members, icon: UsersRound }
const equipment: NavigationDestination = { title: 'Equipment', route: routes.equipment, icon: Boxes }

export function navigationDestinations(section: NavigationSection, access: NavigationAccess): NavigationDestination[] {
    if (section === 'work') return workDestinations
    if (section === 'production') return access.canManageScheduledMessages ? [...productionDestinations, scheduledMessages] : productionDestinations
    return access.canManageMembers ? [members, equipment] : [equipment]
}

export function isNavigationSection(value: string | undefined): value is NavigationSection {
    return navigationSections.some(section => section.id === value)
}

export function navigationSectionForPath(pathname: string): NavigationSection | null {
    const route = pathname.split('/')[1]
    if (workDestinations.some(destination => destination.route === route)) return 'work'
    if ([...productionDestinations, scheduledMessages].some(destination => destination.route === route)) return 'production'
    if ([members, equipment].some(destination => destination.route === route)) return 'people'
    return null
}
