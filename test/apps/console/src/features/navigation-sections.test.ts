import { describe, expect, it } from 'vitest'
import { isNavigationSection, navigationDestinations, navigationEntryRoute, navigationSectionForPath } from '../../../../../apps/console/src/features/navigation-sections'

it('shows quote management only to admins and resolves its navigation section', () => {
    const editor = { canManageMembers: true, canManageScheduledMessages: true, canManageTelegram: false, canManageQuotes: false }
    expect(navigationDestinations('people', editor).map(item => item.route)).not.toContain('daily-quotes')
    expect(navigationDestinations('people', { ...editor, canManageQuotes: true }).map(item => item.route)).toContain('daily-quotes')
    expect(navigationSectionForPath('/daily-quotes')).toBe('people')
})

describe('workspace navigation', () => {
    it.each([
        ['/requests/123', 'work'], ['/bookings/123', 'work'], ['/venues/123', 'work'],
        ['/overview', 'overview'], ['/work', 'work'], ['/checklists/templates', 'production'], ['/schedule', 'work'], ['/streams/meeting/123', 'production'],
        ['/broadcasts', 'production'], ['/scheduled-messages/templates/123', 'communications'], ['/telegram', 'communications'], ['/venue-catalog', 'people'],
        ['/members', 'people'], ['/equipment/123', 'people'], ['/account/settings', null],
    ])('resolves direct detail and management paths %s', (path, section) => {
        expect(navigationSectionForPath(path)).toBe(section)
    })

    it('exposes member and message management only when permitted', () => {
        const restricted = { canManageMembers: false, canManageScheduledMessages: false, canManageTelegram: false, canManageQuotes: false }
        const privileged = { canManageMembers: true, canManageScheduledMessages: true, canManageTelegram: true, canManageQuotes: true }
        expect(navigationDestinations('people', restricted).map(item => item.route)).toEqual(['equipment', 'venue-catalog'])
        expect(navigationDestinations('people', privileged).map(item => item.route)).toEqual(['members', 'equipment', 'venue-catalog', 'daily-quotes'])
        expect(navigationDestinations('production', restricted).map(item => item.route)).toEqual(['streams', 'broadcasts', 'checklists'])
        expect(navigationDestinations('production', privileged).map(item => item.route)).toEqual(['streams', 'broadcasts', 'checklists'])
    })

    it('keeps direct destinations free of a secondary menu and separates communications permissions', () => {
        const editor = { canManageMembers: true, canManageScheduledMessages: true, canManageTelegram: false, canManageQuotes: false }
        const admin = { ...editor, canManageTelegram: true, canManageQuotes: true }
        expect(navigationDestinations('overview', admin)).toEqual([])
        expect(navigationDestinations('work', admin)).toEqual([])
        expect(navigationDestinations('communications', editor).map(item => item.route)).toEqual(['scheduled-messages'])
        expect(navigationDestinations('communications', admin).map(item => item.route)).toEqual(['scheduled-messages', 'telegram'])
    })

    it('opens the first permitted page when entering a main navigation group', () => {
        const viewer = { canManageMembers: false, canManageScheduledMessages: false, canManageTelegram: false, canManageQuotes: false }
        const admin = { canManageMembers: true, canManageScheduledMessages: true, canManageTelegram: true, canManageQuotes: true }
        expect(navigationEntryRoute('production', admin)).toBe('streams')
        expect(navigationEntryRoute('communications', admin)).toBe('scheduled-messages')
        expect(navigationEntryRoute('communications', viewer)).toBeNull()
        expect(navigationEntryRoute('people', admin)).toBe('members')
        expect(navigationEntryRoute('people', viewer)).toBe('equipment')
        expect(navigationEntryRoute('work', admin)).toBe('work')
        expect(navigationSectionForPath('/account/settings/message-templates/request.created')).toBeNull()
    })

    it('does not infer sections from similarly named or unknown paths', () => {
        expect(navigationSectionForPath('/requests-extra')).toBeNull()
        expect(isNavigationSection('people')).toBe(true)
        expect(isNavigationSection(undefined)).toBe(false)
        expect(isNavigationSection('account')).toBe(false)
    })
})
