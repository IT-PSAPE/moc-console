import assert from 'node:assert/strict'
import { it } from 'node:test'
import { handleScheduledMessages } from '../../../../../apps/api/server/scheduled-messages/handler.js'
import type { ApiResponse } from '../../../../../apps/api/server/http.js'

const workspace = '10000000-0000-4000-8000-000000000001'
const occurrence = '30000000-0000-4000-8000-000000000001'
async function requestResend(options: { permitted?: boolean; foreign?: boolean; revision?: unknown } = {}) {
    const originalFetch = globalThis.fetch
    const environment = { VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL, SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY, ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS }
    process.env.VITE_SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SECRET_KEY = 'test-service-key'
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173'
    let status = 200
    const calls: { name: string; body: unknown }[] = []
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input))
        function json(value: unknown): Response { return new Response(JSON.stringify(value), { status: 200 }) }
        if (url.pathname === '/auth/v1/user') return json({ id: '20000000-0000-4000-8000-000000000002' })
        if (url.pathname.endsWith('/workspace_users') && url.searchParams.has('user_id')) return json({ roles: { can_update: options.permitted !== false } })
        if (url.pathname.endsWith('/scheduled_message_occurrences') && url.searchParams.has('id')) return json({ id: occurrence, workspace_id: options.foreign ? 'another-workspace' : workspace, state: 'sent', revision: 7, telegram_message_id: 700 })
        if (url.pathname.includes('/rpc/')) {
            calls.push({ name: url.pathname.split('/').at(-1)!, body: JSON.parse(String(init?.body)) as unknown })
            return json(null)
        }
        return json([])
    }
    try {
        const response: ApiResponse = { status(code) { status = code; return response }, json() {}, setHeader() {} }
        await handleScheduledMessages({ method: 'POST', headers: { origin: 'http://localhost:5173', 'x-moc-session': 'session' }, body: {
            workspaceId: workspace, op: 'occurrence.resend', data: { id: occurrence, revision: options.revision === undefined ? 7 : options.revision },
        } }, response)
        return { status, calls }
    } finally {
        globalThis.fetch = originalFetch
        for (const [name, value] of Object.entries(environment)) {
            if (value === undefined) delete process.env[name]
            else process.env[name] = value
        }
    }
}

it('requests a revision-checked resend through the existing authenticated management endpoint', async () => {
    const result = await requestResend()
    assert.equal(result.status, 200)
    assert.deepEqual(result.calls.filter(call => call.name === 'request_scheduled_resend'), [{ name: 'request_scheduled_resend', body: { p_actor: '20000000-0000-4000-8000-000000000002', p_id: occurrence, p_revision: 7 } }])
})
it('rejects a viewer before requesting a resend', async () => {
    const result = await requestResend({ permitted: false })
    assert.equal(result.status, 403)
    assert.equal(result.calls.length, 0)
})
it('rejects resending an occurrence from another workspace', async () => {
    const result = await requestResend({ foreign: true })
    assert.equal(result.status, 403)
    assert.equal(result.calls.length, 0)
})
it('rejects a resend without a numeric occurrence revision', async () => {
    const result = await requestResend({ revision: '7' })
    assert.equal(result.status, 400)
    assert.equal(result.calls.length, 0)
})
