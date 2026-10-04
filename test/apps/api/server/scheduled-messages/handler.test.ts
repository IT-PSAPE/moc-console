import assert from 'node:assert/strict'
import { describe, it as bunIt } from 'bun:test'
import type { ApiRequest, ApiResponse } from '../../../../../apps/api/server/http.js'
import type { QueryResultRow } from 'pg'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'
import { authCookieHeaders, configureAuthSessionTestEnvironment, withAuthSessionResponse } from '../../auth-test-session.js'

function it(name:string,body:()=>Promise<void>):void { bunIt(name,()=>runWithSqlFixture(body)) }
const {handleScheduledMessages}=await import('../../../../../apps/api/server/scheduled-messages/handler.js')

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
      status: 401, body: { error: 'Missing session cookie' },
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
    const cleanupAuth=configureAuthSessionTestEnvironment()
    const workspaceId = '10000000-0000-4000-8000-000000000001'
    let rosterRead = false
    globalThis.fetch=withAuthSessionResponse(originalFetch,'20000000-0000-4000-8000-000000000002','editor@example.test')
    setSqlFixture({
      queryRows:async(text:string,values:readonly unknown[]=[]):Promise<QueryResultRow[]>=>{
        if(text.includes('FROM public.workspace_users w JOIN public.users u')) {
          rosterRead=true
          assert.equal(values[0],workspaceId)
          assert.ok(text.includes("nullif(btrim(u.telegram_chat_id),'') IS NOT NULL"))
          return [
            {user_id:'member',member_type_id:'members',name:'Craig',surname:'Hero'},
            {user_id:'volunteer',member_type_id:'volunteers',name:'Sarah',surname:'Volunteer'},
          ]
        }
        return []
      },
      queryActor:async(text:string)=>text.includes('SELECT EXISTS(')?[{allowed:true}]:[],
    })
    try {
      let status = 200
      let body: unknown
      const response: ApiResponse = { status(code) { status = code; return response }, json(value) { body = value }, setHeader() {} }
      await handleScheduledMessages({ method: 'GET', headers: { ...authCookieHeaders, origin: undefined }, query: { workspaceId } }, response)
      assert.equal(status, 200)
      assert.deepEqual((body as { members?: unknown }).members, [
        { id: 'member', memberTypeId: 'members', name: 'Craig Hero' },
        { id: 'volunteer', memberTypeId: 'volunteers', name: 'Sarah Volunteer' },
      ])
      assert.equal(rosterRead, true)
    } finally {
      globalThis.fetch = originalFetch
      cleanupAuth()
    }
  })
})
