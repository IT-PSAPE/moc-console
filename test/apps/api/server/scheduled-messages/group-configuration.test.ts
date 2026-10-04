import assert from 'node:assert/strict'
import { it } from 'node:test'
import { handleScheduledMessages } from '../../../../../apps/api/server/scheduled-messages/handler.js'
import type { ApiResponse } from '../../../../../apps/api/server/http.js'

const groups = [
    { id: '10000000-0000-4000-8000-000000000001', label: 'Noon' },
    { id: '10000000-0000-4000-8000-000000000002', label: 'Evening' },
]
async function saveTemplate(messageType: string, attendanceGroups: unknown): Promise<{ status: number; body: unknown; writes: Record<string, unknown>[] }> {
    const originalFetch = globalThis.fetch
    const savedUrl = process.env.VITE_SUPABASE_URL
    const savedKey = process.env.SUPABASE_SECRET_KEY
    const savedOrigins = process.env.ALLOWED_ORIGINS
    process.env.VITE_SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SECRET_KEY = 'test-secret'
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173'
    let status = 200
    let body: unknown
    const writes: Record<string, unknown>[] = []
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input))
        function json(value: unknown): Response { return new Response(JSON.stringify(value), { status: 200 }) }
        if (url.pathname === '/auth/v1/user') return json({ id: 'editor' })
        if (url.pathname.endsWith('/save_scheduled_template')) {
            writes.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
            return json('template')
        }
        if (url.pathname.endsWith('/workspace_users') && url.searchParams.has('user_id')) return json({ roles: { can_update: true } })
        return json([])
    }
    try {
        const response: ApiResponse = { status(code) { status = code; return response }, json(value) { body = value }, setHeader() {} }
        await handleScheduledMessages({ method: 'POST', headers: { origin: 'http://localhost:5173', 'x-moc-session': 'test-session' }, body: {
            workspaceId: '10000000-0000-4000-8000-000000000099', op: 'template.save',
            data: { name: 'Service', messageType, body: '{{title}}', fields: { title: 'Service' }, audience: [], attendanceGroups },
        } }, response)
        return { status, body, writes }
    } finally {
        globalThis.fetch = originalFetch
        if (savedUrl === undefined) delete process.env.VITE_SUPABASE_URL
        else process.env.VITE_SUPABASE_URL = savedUrl
        if (savedKey === undefined) delete process.env.SUPABASE_SECRET_KEY
        else process.env.SUPABASE_SECRET_KEY = savedKey
        if (savedOrigins === undefined) delete process.env.ALLOWED_ORIGINS
        else process.env.ALLOWED_ORIGINS = savedOrigins
    }
}
it('rejects unusable group options before writing a template', async () => {
    const result = await saveTemplate('pre_attendance', [groups[0], { ...groups[1], label: 'noon' }])
    assert.equal(result.status, 400)
    assert.equal(result.writes.length, 0)
})
it('rejects attendance group configuration for announcements', async () => {
    const result = await saveTemplate('announcement', groups)
    assert.equal(result.status, 400)
    assert.equal(result.writes.length, 0)
})
it('normalizes group labels while persisting stable IDs', async () => {
    const result = await saveTemplate('pre_attendance', [{ ...groups[0], label: ' Noon ' }, groups[1]])
    assert.equal(result.status, 200)
    const data = result.writes[0].p_data as { attendanceGroups: unknown }
    assert.deepEqual(data.attendanceGroups, groups)
})
