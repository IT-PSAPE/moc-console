import { describe, expect, it } from 'vitest'
import { isNavigationSection, navigationDestinations, navigationSectionForPath } from '../../../../../apps/console/src/features/navigation-sections'

describe('workspace navigation', () => {
    it.each([
        ['/requests/123', 'work'], ['/bookings/123', 'work'], ['/venues/123', 'work'],
        ['/checklists/templates', 'work'], ['/schedule', 'work'], ['/streams/meeting/123', 'production'],
        ['/broadcasts', 'production'], ['/scheduled-messages/templates/123', 'production'],
        ['/members', 'people'], ['/equipment/123', 'people'], ['/account/settings', null],
    ])('resolves direct detail and management paths %s', (path, section) => {
        expect(navigationSectionForPath(path)).toBe(section)
    })

    it('exposes member and message management only when permitted', () => {
        const restricted = { canManageMembers: false, canManageScheduledMessages: false }
        const privileged = { canManageMembers: true, canManageScheduledMessages: true }
        expect(navigationDestinations('people', restricted).map(item => item.route)).toEqual(['equipment'])
        expect(navigationDestinations('people', privileged).map(item => item.route)).toEqual(['members', 'equipment'])
        expect(navigationDestinations('production', restricted).map(item => item.route)).toEqual(['streams', 'broadcasts'])
        expect(navigationDestinations('production', privileged).map(item => item.route)).toEqual(['streams', 'broadcasts', 'scheduled-messages'])
    })

    it('does not infer sections from similarly named or unknown paths', () => {
        expect(navigationSectionForPath('/requests-extra')).toBeNull()
        expect(isNavigationSection('people')).toBe(true)
        expect(isNavigationSection(undefined)).toBe(false)
        expect(isNavigationSection('account')).toBe(false)
    })
})
