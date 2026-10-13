import { describe, expect, it } from 'vitest'
import { resolveDetailReturn } from '../../../../../apps/console/src/lib/detail-return'

describe('detail return navigation', () => {
    it('preserves the source view, filters and selected item', () => {
        expect(resolveDetailReturn({ returnTo: '/requests?view=list&q=service&selected=123' }, '/requests')).toBe('/requests?view=list&q=service&selected=123')
        expect(resolveDetailReturn({ returnTo: '/bookings?q=camera' }, '/bookings')).toBe('/bookings?q=camera')
        expect(resolveDetailReturn({ returnTo: '/schedule?month=2026-12&type=venue' }, '/venues')).toBe('/schedule?month=2026-12&type=venue')
        expect(resolveDetailReturn({ returnTo: '/venues?view=list&q=camera' }, '/bookings')).toBe('/venues?view=list&q=camera')
    })

    it.each([undefined, null, {}, { returnTo: 'https://example.test' }, { returnTo: '//example.test' }, { returnTo: '/\\example.test' }, { returnTo: 3 }])('falls back for absent or external source %j', (state) => {
        expect(resolveDetailReturn(state, '/requests')).toBe('/requests')
    })
})
