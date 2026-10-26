import { describe, expect, test } from 'vitest'
import type { ItemActivity, ItemComment } from '@moc/types/discussion'
import { formatItemComments, groupItemActivity } from '../../../../../../apps/console/src/features/item-discussion/activity-formatters'
import { formatChangeValue, formatDiscussionActor, formatDiscussionTime } from '../../../../../../apps/console/src/features/item-discussion/discussion-formatters'

const actor = { id: 'member', name: 'Craig Smith', avatarUrl: null, kind: 'member' as const }
const now = Date.parse('2026-10-26T12:00:00Z')
function activity(id: string, createdAt: string, changes: ItemActivity['changes'] = []): ItemActivity {
    return { id, createdAt, actor, changes, details: {}, itemKind: 'request', itemId: 'request', type: 'updated', operationId: null }
}

describe('item discussion formatting', () => {
    test('preserves every changed field and makes multiple or long changes expandable', () => {
        const rows = groupItemActivity([activity('one', '2026-10-26T11:00:00Z', [{ field: 'status', before: 'not_started', after: 'in_progress' }, { field: 'title', before: 'Original', after: 'Changed' }])], now)
        expect(rows[0].items[0].changes).toEqual([{ field: 'Status', before: 'Not started', after: 'In progress' }, { field: 'Title', before: 'Original', after: 'Changed' }])
        expect(rows[0].items[0]).toMatchObject({ expandable: true, changesLabel: 'View 2 changes' })
        expect(groupItemActivity([activity('long', '2026-10-26T11:00:00Z', [{ field: 'title', before: 'a'.repeat(200), after: 'New' }])], now)[0].items[0].expandable).toBe(true)
    })

    test('deduplicates overlapping pages, sorts deterministically newest-first and groups by local day', () => {
        const first = activity('a', '2026-10-26T11:00:00Z')
        const groups = groupItemActivity([activity('old', '2026-10-25T12:00:00Z'), first, activity('b', first.createdAt), first], now)
        expect(groups.map(group => group.label)).toEqual(['Today', 'Yesterday'])
        expect(groups[0].items.map(item => item.id)).toEqual(['b', 'a'])
    })

    test('comments are chronological and imported text stays literal', () => {
        const comment: ItemComment = { id: 'new', createdAt: '2026-10-26T11:00:00Z', actor, body: '<script>alert(1)</script>\nSecond line', origin: 'legacy-note', itemKind: 'booking', itemId: 'booking' }
        const comments = formatItemComments([comment, { ...comment, id: 'old', createdAt: '2026-10-25T12:00:00Z' }, comment], now)
        expect(comments.map(row => row.id)).toEqual(['old', 'new'])
        expect(comments[1]).toMatchObject({ body: comment.body, origin: 'Imported from notes' })
    })

    test('missing actors do not become automation and public submissions remain identifiable', () => {
        expect(formatDiscussionActor({ ...actor, name: '', kind: 'unknown' }).name).toBe('Unknown')
        expect(formatDiscussionActor({ ...actor, kind: 'requester' })).toMatchObject({ initials: 'CS', source: 'Public submission' })
    })

    test('one transaction produces one expandable entry without dropping child actions or values', () => {
        const root = { ...activity('root', '2026-10-26T11:00:00Z', [{ field: 'title', before: 'Before', after: 'After' }]), operationId: 'transaction' }
        const child = { ...activity('child', root.createdAt, [{ field: 'user_id', before: null, after: 'uuid' }]), operationId: 'transaction', type: 'assignee_added', details: { label: 'Devon' } }
        const rows = groupItemActivity([root, child], now)[0].items
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ expandable: true, action: 'made 2 updates', changesLabel: 'View 2 updates' })
        expect(rows[0].changes).toContainEqual({ field: 'Devon · Member', before: 'Not set', after: 'Devon' })
        expect(rows[0].description).toContain('Added an assignee · Devon')
    })

    test.each(['user_id', 'equipment_id'])('uses independent snapshot labels when %s changes from A to B', field => {
        const entry = { ...activity('relation', '2026-10-26T11:00:00Z', [{ field, before: 'id-a', after: 'id-b' }]), details: { label: 'B', before_label: 'A', after_label: 'B' } }
        expect(groupItemActivity([entry], now)[0].items[0].changes[0]).toMatchObject({ before: 'A', after: 'B' })
        expect(groupItemActivity([{ ...entry, details: { label: 'B' } }], now)[0].items[0].changes[0]).toMatchObject({ before: 'id-a', after: 'id-b' })
        expect(groupItemActivity([{ ...entry, details: { label: 'B', after_label: 'B' } }], now)[0].items[0].changes[0]).toMatchObject({ before: 'id-a', after: 'B' })
    })

    test.each(['user_id', 'equipment_id'])('retains generic %s labels only for additions and removals', field => {
        const added = { ...activity('added', '2026-10-26T11:00:00Z', [{ field, before: null, after: 'id-b' }]), details: { label: 'B' } }
        const removed = { ...activity('removed', '2026-10-26T11:00:00Z', [{ field, before: 'id-a', after: null }]), details: { label: 'A' } }
        expect(groupItemActivity([added], now)[0].items[0].changes[0]).toMatchObject({ before: 'Not set', after: 'B' })
        expect(groupItemActivity([removed], now)[0].items[0].changes[0]).toMatchObject({ before: 'A', after: 'Not set' })
        expect(groupItemActivity([{ ...removed, details: { label: 'Other', before_label: 'A' } }], now)[0].items[0].changes[0]).toMatchObject({ before: 'A', after: 'Not set' })
    })

    test('formats booleans, missing values, records and exact and relative times', () => {
        expect(formatChangeValue(null)).toBe('Not set')
        expect(formatChangeValue(false)).toBe('No')
        expect(formatChangeValue([{ name: 'Camera A' }, { title: 'Camera B' }])).toBe('Camera A, Camera B')
        expect(formatDiscussionTime('2026-10-26T11:00:00Z', now)).toMatchObject({ relative: '1 hour ago', clock: '11:00' })
        expect(formatDiscussionTime('2026-10-26T11:00:00Z', now).exact).toContain('26 Oct 2026')
        expect(formatDiscussionTime('invalid', now).relative).toBe('Unknown time')
    })
})
