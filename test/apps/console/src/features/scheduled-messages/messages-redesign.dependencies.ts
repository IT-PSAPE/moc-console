import type { ScheduledSnapshot } from '@moc/notifications'

export function useWorkspace(): { currentWorkspaceId: string; role: { can_update: boolean } } {
    return { currentWorkspaceId: '10000000-0000-4000-8000-000000000001', role: { can_update: true } }
}

export function useScheduledMessageAccess(): boolean { return true }

export function fetchScheduledMessages(workspaceId: string, view: 'active' | 'history' = 'active', cursor?: string): Promise<ScheduledSnapshot> {
    const params = new URLSearchParams({ workspaceId, view })
    if (cursor) params.set('cursor', cursor)
    return request(`/fixture-api?${params.toString()}`)
}

export function mutateScheduledMessage(workspaceId: string, op: string, data: unknown): Promise<ScheduledSnapshot> {
    return request('/fixture-api', { workspaceId, op, data })
}

async function request(path = '/fixture-api', body?: unknown): Promise<ScheduledSnapshot> {
    const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const result = await response.json() as ScheduledSnapshot & { error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Fixture request failed')
    return result
}
