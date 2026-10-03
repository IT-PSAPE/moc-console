import type { ScheduledSnapshot } from '@moc/notifications'

// Only external boundaries are replaced; the production screens, editor,
// navigation guard and collection hook run unchanged in this local fixture.
export function useWorkspace(): { currentWorkspaceId: string } {
    return { currentWorkspaceId: '10000000-0000-4000-8000-000000000001' }
}
export async function fetchScheduledMessages(): Promise<ScheduledSnapshot> {
    return request()
}
export async function mutateScheduledMessage(workspaceId: string, op: string, data: unknown): Promise<ScheduledSnapshot> {
    return request({ workspaceId, op, data })
}
async function request(body?: unknown): Promise<ScheduledSnapshot> {
    const response = await fetch('/fixture-api', { method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined })
    const result = await response.json() as ScheduledSnapshot & { error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Fixture request failed')
    return result
}
