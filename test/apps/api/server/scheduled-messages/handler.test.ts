import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ApiRequest, ApiResponse } from '../../../../../apps/api/server/http.js'
import { handleScheduledMessages } from '../../../../../apps/api/server/scheduled-messages/handler.js'

async function requestWithoutSession(method: string, origin?: string): Promise<{ status: number; body: unknown }> {
  let status = 200
  let body: unknown
  const response: ApiResponse = {
    status(code) { status = code; return response },
    json(value) { body = value },
    setHeader() {},
  }
  const request: ApiRequest = { method, headers: origin === undefined ? {} : { origin } }
  await handleScheduledMessages(request, response)
  return { status, body }
}

describe('scheduled message browser origin checks', () => {
  it('requires authentication for same-origin GET requests without an Origin header', async () => {
    assert.deepEqual(await requestWithoutSession('GET'), {
      status: 401, body: { error: 'Missing session token' },
    })
  })

  it('rejects explicit untrusted origins on reads', async () => {
    assert.deepEqual(await requestWithoutSession('GET', 'https://untrusted.example'), {
      status: 403, body: { error: 'Forbidden origin' },
    })
  })

  it('rejects writes without an Origin header', async () => {
    assert.deepEqual(await requestWithoutSession('POST'), {
      status: 403, body: { error: 'Forbidden origin' },
    })
  })
})

describe('scheduled message attendee snapshot', () => {
  it('returns only Telegram-connected workspace members without exposing their Telegram IDs', async () => {
    const originalFetch = globalThis.fetch
    const savedUrl = process.env.VITE_SUPABASE_URL
    const savedKey = process.env.SUPABASE_SECRET_KEY
    process.env.VITE_SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SECRET_KEY = 'test-secret'
    const workspaceId = '10000000-0000-4000-8000-000000000001'
    let rosterRead = false
    globalThis.fetch = async (input) => {
      const url = new URL(String(input))
      const table = url.pathname.split('/').pop()
      function json(value: unknown): Response { return new Response(JSON.stringify(value), { status: 200 }) }
      if (url.pathname === '/auth/v1/user') return json({ id: 'editor', email: 'editor@example.test' })
      if (table === 'materialize_scheduled_messages') return json(null)
      if (table === 'workspace_users') {
        assert.equal(url.searchParams.get('workspace_id'), `eq.${workspaceId}`)
        if (url.searchParams.has('user_id')) return json({ roles: { can_update: true } })
        rosterRead = true
        const selection = url.searchParams.get('select') ?? ''
        assert.ok(!/email|avatar_url/.test(selection))
        assert.ok(selection.includes('telegram_chat_id'))
        assert.equal(url.searchParams.get('users.telegram_chat_id'), 'not.is.null')
        return json([
          { user_id: 'member', member_type_id: 'members', users: { name: 'Craig', surname: 'Hero', telegram_chat_id: '123' } },
          { user_id: 'volunteer', member_type_id: 'volunteers', users: [{ name: 'Sarah', surname: 'Volunteer', telegram_chat_id: '456' }] },
          { user_id: 'unlinked', member_type_id: 'members', users: { name: 'No', surname: 'Connection', telegram_chat_id: null } },
          { user_id: 'empty', member_type_id: 'members', users: { name: 'Empty', surname: 'Connection', telegram_chat_id: '' } },
          { user_id: 'blank', member_type_id: 'members', users: { name: 'Blank', surname: 'Connection', telegram_chat_id: '   ' } },
          { user_id: 'removed', member_type_id: 'members', users: null },
        ])
      }
      return json([])
    }
    try {
      let status = 200
      let body: unknown
      const response: ApiResponse = { status(code) { status = code; return response }, json(value) { body = value }, setHeader() {} }
      await handleScheduledMessages({ method: 'GET', headers: { 'x-moc-session': 'fixture-session' }, query: { workspaceId } }, response)
      assert.equal(status, 200)
      assert.deepEqual((body as { members?: unknown }).members, [
        { id: 'member', memberTypeId: 'members', name: 'Craig Hero' },
        { id: 'volunteer', memberTypeId: 'volunteers', name: 'Sarah Volunteer' },
      ])
      assert.equal(rosterRead, true)
    } finally {
      globalThis.fetch = originalFetch
      if (savedUrl === undefined) delete process.env.VITE_SUPABASE_URL
      else process.env.VITE_SUPABASE_URL = savedUrl
      if (savedKey === undefined) delete process.env.SUPABASE_SECRET_KEY
      else process.env.SUPABASE_SECRET_KEY = savedKey
    }
  })
})
