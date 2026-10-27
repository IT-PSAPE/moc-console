import { describe, expect, test } from 'vitest'
import { renderScheduledContentTokens, validateScheduledContentTokens } from '../../../../packages/notifications/src/scheduled-content-tokens'

describe('explicit scheduled content tokens', () => {
    test('renders typed date and time values independently of schedule time', () => {
        const body = '{{date:2024-02-29}} {{time:23:59}}'
        validateScheduledContentTokens(body)
        expect(renderScheduledContentTokens(body)).toBe('410229 23:59')
    })

    test('renders tokens in code text but rejects tokens in links and other HTML attributes', () => {
        expect(renderScheduledContentTokens('<code>{{time:07:30}}</code>')).toBe('<code>07:30</code>')
        expect(() => validateScheduledContentTokens('<a href="/events/{{date:2026-10-04}}">Service</a>')).toThrow('HTML attributes')
        expect(() => validateScheduledContentTokens('<img src="/{{time:07:30}}">')).toThrow('HTML attributes')
    })

    test.each(['{{date:2023-02-29}}', '{{date:2024-04-31}}', '{{date:0000-01-01}}', '{{time:24:00}}', '{{time:12:60}}'])('rejects invalid fixed content %s', body => {
        expect(() => validateScheduledContentTokens(body)).toThrow()
    })

    test.each(['{{title}}', '{{date}}', '{{time}}', '{{date:2026-10-04}} {{hidden}}', '{{time:7:30}}', '{{date:2026-10-04}'])('rejects legacy and malformed tokens %s', body => {
        expect(() => validateScheduledContentTokens(body)).toThrow()
    })
})
