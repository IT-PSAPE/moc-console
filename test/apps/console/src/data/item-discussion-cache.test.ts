import { afterEach, expect, test } from 'vitest'
import { queryClient } from '../../../../../apps/console/src/lib/query-client'
import { changedDiscussionItems } from '../../../../../apps/console/src/data/item-discussion-cache'
import { setWorkspaceDetailData, setWorkspaceResourceData, updateWorkspaceResourceData, workspaceResourceKey } from '../../../../../apps/console/src/data/workspace-resource-cache'

afterEach(() => queryClient.clear())

test('only changed collection records and their old/new linked requests refresh', () => {
    const unchanged = { id: 'same', title: 'Same' }
    const before = [unchanged, { id: 'edited', requestId: 'old-request' }]
    const after = [unchanged, { id: 'edited', requestId: 'new-request' }]
    expect(changedDiscussionItems('bookings', before, after)).toEqual([{ kind: 'booking', id: 'edited' }, { kind: 'request', id: 'old-request' }, { kind: 'request', id: 'new-request' }])
    expect(changedDiscussionItems('bookings', after, after)).toEqual([])
})

test('supports per-item assignees, request-link resources and scheduled occurrence snapshots', () => {
    expect(changedDiscussionItems('request-assignees:r', [], [{}])).toEqual([{ kind: 'request', id: 'r' }])
    expect(changedDiscussionItems('booking:b:request-link', null, 'request')).toEqual([{ kind: 'booking', id: 'b' }])
    expect(changedDiscussionItems('scheduled-messages', { occurrences: [] }, { occurrences: [{ id: 'occurrence' }] })).toEqual([{ kind: 'scheduled-message', id: 'occurrence' }])
})

test('booking membership refreshes affected equipment and schedule changes refresh only related occurrences', () => {
    expect(changedDiscussionItems('bookings', [{ id: 'booking', items: [{ equipmentId: 'old' }] }], [{ id: 'booking', items: [{ equipmentId: 'new' }] }])).toEqual([{ kind: 'booking', id: 'booking' }, { kind: 'equipment', id: 'old' }, { kind: 'equipment', id: 'new' }])
    const occurrences = [{ id: 'related', schedule_id: 'edited' }, { id: 'other', schedule_id: 'unchanged' }]
    const unchangedSchedule = { id: 'unchanged' }
    const previous = { occurrences, schedules: [{ id: 'edited', auto_send: false }, unchangedSchedule] }
    const next = { occurrences, schedules: [{ id: 'edited', auto_send: true }, unchangedSchedule] }
    expect(changedDiscussionItems('scheduled-messages', previous, next)).toEqual([{ kind: 'scheduled-message', id: 'related' }])
})

test('booking status and title changes refresh equipment activity even when membership stays the same', () => {
    const before = { id: 'booking', title: 'Before', status: 'checked_out', items: [{ equipmentId: 'camera' }] }
    const after = { ...before, title: 'After', status: 'returned' }
    expect(changedDiscussionItems('bookings', [before], [after])).toEqual([{ kind: 'booking', id: 'booking' }, { kind: 'equipment', id: 'camera' }])
    expect(changedDiscussionItems('bookings', before, after, 'booking')).toEqual([{ kind: 'booking', id: 'booking' }, { kind: 'equipment', id: 'camera' }])
})

test('successful writes invalidate only the affected item activity within the workspace', () => {
    const workspaceId = 'alpha'
    const changed = workspaceResourceKey(workspaceId, 'item-activity:request:edited')
    const same = workspaceResourceKey(workspaceId, 'item-activity:request:same')
    const otherWorkspace = workspaceResourceKey('other', 'item-activity:request:edited')
    setWorkspaceResourceData(workspaceId, 'requests', [{ id: 'same', title: 'Same' }, { id: 'edited', title: 'Before' }])
    for (const key of [changed, same, otherWorkspace]) queryClient.setQueryData(key, { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] })
    updateWorkspaceResourceData<Array<{ id: string; title: string }>>(workspaceId, 'requests', current => current?.map(item => item.id === 'edited' ? { ...item, title: 'After' } : item))
    expect(queryClient.getQueryState(changed)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(same)?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(otherWorkspace)?.isInvalidated).toBe(false)
})

test('unchanged structural data does not refetch history, but detail saves do', () => {
    setWorkspaceResourceData('alpha', 'requests', [{ id: 'r', title: 'Same' }])
    const key = workspaceResourceKey('alpha', 'item-activity:request:r')
    queryClient.setQueryData(key, [])
    setWorkspaceResourceData('alpha', 'requests', [{ id: 'r', title: 'Same' }])
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false)
    setWorkspaceDetailData('alpha', 'requests', 'r', { id: 'r', title: 'New' })
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
})
