import { beforeEach, expect, test, vi } from 'vitest'
import type { ScheduledOccurrence } from '@moc/notifications'
import { HookRuntime, createMockReactModule } from '../../../../broadcast/src/features/test-hook-runtime'
import { useScheduledOccurrenceLink } from '../../../../../../apps/console/src/features/scheduled-messages/use-scheduled-occurrence-link'

const router = vi.hoisted(() => ({ pathname: '/scheduled-messages', searchParams: new URLSearchParams(), navigationOptions: null as { replace?: boolean } | null }))
const setSearchParams = vi.hoisted(() => vi.fn((next: URLSearchParams, options?: { replace?: boolean }) => { router.searchParams = new URLSearchParams(next); router.navigationOptions = options ?? null }))

vi.mock('react', async importOriginal => ({ ...await importOriginal<typeof import('react')>(), ...createMockReactModule() }))
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: router.pathname }), useSearchParams: () => [router.searchParams, setSearchParams] }))

function occurrence(id = 'message-a', workspaceId = 'workspace-a'): ScheduledOccurrence {
    return {
        id, workspace_id: workspaceId, schedule_id: 'schedule', occurrence_on: '2026-10-29', send_on: '2026-10-29T15:00:00Z',
        post_role: 'primary', parent_occurrence_id: null, legacy_closed: false, message_type: 'announcement', body: '<p>Welcome</p>',
        attendee_ids: [], attendance_groups: [], state: 'scheduled', revision: 1, synced_revision: 0, telegram_message_id: null, last_sync_error: null,
    }
}

type Options = Parameters<typeof useScheduledOccurrenceLink>[0]
function options(overrides: Partial<Options> = {}): Options {
    return { workspaceId: 'workspace-a', ready: true, enabled: true, occurrences: [occurrence()], ...overrides }
}

beforeEach(() => {
    router.pathname = '/scheduled-messages'
    router.searchParams = new URLSearchParams('occurrence=message-a&filter=retained')
    router.navigationOptions = null
    setSearchParams.mockClear()
})

test('waits for the upcoming snapshot before opening the linked occurrence', () => {
    const hook = new HookRuntime(useScheduledOccurrenceLink)
    expect(hook.render(options({ ready: false, occurrences: [] })).occurrence).toBeNull()
    expect(setSearchParams).not.toHaveBeenCalled()
    expect(hook.render(options()).occurrence?.id).toBe('message-a')
    expect(setSearchParams).not.toHaveBeenCalled()
    hook.unmount()
})

test('closing removes only the occurrence query parameter and does not reopen it', () => {
    const hook = new HookRuntime(useScheduledOccurrenceLink)
    hook.render(options()).close()
    expect(router.searchParams.get('occurrence')).toBeNull()
    expect(router.searchParams.get('filter')).toBe('retained')
    expect(router.navigationOptions).toEqual({ replace: true })
    expect(hook.rerender().occurrence).toBeNull()
    hook.unmount()
})

test('a missing or inaccessible occurrence leaves the list visible and clears the unusable link', () => {
    const hook = new HookRuntime(useScheduledOccurrenceLink)
    expect(hook.render(options({ occurrences: [] })).occurrence).toBeNull()
    expect(router.searchParams.get('occurrence')).toBeNull()
    expect(router.searchParams.get('filter')).toBe('retained')
    hook.unmount()
})

test('workspace changes cannot open a record in the new workspace even when IDs match', () => {
    const hook = new HookRuntime(useScheduledOccurrenceLink)
    expect(hook.render(options()).occurrence?.workspace_id).toBe('workspace-a')
    const next = options({ workspaceId: 'workspace-b', occurrences: [occurrence('message-a', 'workspace-b')] })
    expect(hook.render(next).occurrence).toBeNull()
    expect(router.searchParams.get('occurrence')).toBeNull()
    expect(hook.rerender().occurrence).toBeNull()
    hook.rerender()
    router.searchParams = new URLSearchParams('occurrence=message-a')
    expect(hook.rerender().occurrence?.workspace_id).toBe('workspace-b')
    hook.unmount()
})

test('a record from another workspace cannot be selected from an invalid snapshot', () => {
    const hook = new HookRuntime(useScheduledOccurrenceLink)
    expect(hook.render(options({ occurrences: [occurrence('message-a', 'workspace-b')] })).occurrence).toBeNull()
    expect(router.searchParams.get('occurrence')).toBeNull()
    hook.unmount()
})

test('composer and history views do not open an occurrence link', () => {
    const hook = new HookRuntime(useScheduledOccurrenceLink)
    router.pathname = '/scheduled-messages/new'
    expect(hook.render(options()).occurrence).toBeNull()
    expect(setSearchParams).not.toHaveBeenCalled()
    router.pathname = '/scheduled-messages'
    expect(hook.render(options({ enabled: false })).occurrence).toBeNull()
    expect(setSearchParams).not.toHaveBeenCalled()
    hook.unmount()
})

test('changing the occurrence parameter selects the newly linked upcoming message', () => {
    const hook = new HookRuntime(useScheduledOccurrenceLink)
    const records = [occurrence(), occurrence('message-b')]
    expect(hook.render(options({ occurrences: records })).occurrence?.id).toBe('message-a')
    router.searchParams = new URLSearchParams('occurrence=message-b')
    expect(hook.rerender().occurrence?.id).toBe('message-b')
    hook.unmount()
})
