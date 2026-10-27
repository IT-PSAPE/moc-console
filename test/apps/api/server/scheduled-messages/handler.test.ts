import assert from 'node:assert/strict'
import { describe, it as runnerIt } from 'vitest'
import type { ApiRequest, ApiResponse } from '../../../../../apps/api/server/http.js'
import type { QueryResultRow } from 'pg'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'
import { authCookieHeaders, configureAuthSessionTestEnvironment, withAuthSessionResponse } from '../../auth-test-session.js'

function it(name:string,body:()=>Promise<void>):void { runnerIt(name,()=>runWithSqlFixture(body)) }
const {handleScheduledMessages,mutateScheduledMessages}=await import('../../../../../apps/api/server/scheduled-messages/handler.js')
const {listHistory}=await import('../../../../../apps/api/server/scheduled-messages/store.js')

async function requestWithoutSession(method: string, origin?: string): Promise<{ status: number; body: unknown }> {
  let status = 200
  let body: unknown
  const response: ApiResponse = { status(code) { status = code; return response }, json(value) { body = value }, setHeader() {} }
  const request: ApiRequest = { method, headers: origin === undefined ? {} : { origin } }
  await handleScheduledMessages(request, response)
  return { status, body }
}

describe('scheduled message browser origin checks', () => {
  it('requires authentication for same-origin GET requests without an Origin header', async () => {
    assert.deepEqual(await requestWithoutSession('GET'), { status: 401, body: { error: 'Missing session cookie' } })
  })
  it('rejects explicit untrusted origins on reads', async () => {
    assert.deepEqual(await requestWithoutSession('GET', 'https://untrusted.example'), { status: 403, body: { error: 'Forbidden origin' } })
  })
  it('rejects writes without an Origin header', async () => {
    assert.deepEqual(await requestWithoutSession('POST'), { status: 403, body: { error: 'Forbidden origin' } })
  })
})

describe('scheduled message attendee snapshot', () => {
  it('returns workspace timezone and all current members without exposing their Telegram IDs', async () => {
    const originalFetch = globalThis.fetch
    const cleanupAuth=configureAuthSessionTestEnvironment()
    const workspaceId = '10000000-0000-4000-8000-000000000001'
    let rosterRead = false
    globalThis.fetch=withAuthSessionResponse(originalFetch,'20000000-0000-4000-8000-000000000002','editor@example.test')
    setSqlFixture({
      queryRows:async(text:string,values:readonly unknown[]=[]):Promise<QueryResultRow[]>=>{
        if(text.includes('public.workspace_timezone')) {
          assert.match(text,/SELECT\s+public\.workspace_timezone\(\$1\)\s+AS\s+workspace_timezone/i)
          assert.deepEqual(values,[workspaceId])
          return [{workspace_timezone:'Africa/Johannesburg'}]
        }
        if(text.includes('FROM public.workspace_users w JOIN public.users u')) {
          rosterRead=true
          assert.equal(values[0],workspaceId)
          assert.ok(!text.includes("nullif(btrim(u.telegram_chat_id),'') IS NOT NULL"))
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
      assert.equal((body as { workspaceTimezone?: string }).workspaceTimezone,'Africa/Johannesburg')
      assert.equal(rosterRead, true)
    } finally {
      globalThis.fetch = originalFetch
      cleanupAuth()
    }
  })
})

describe('direct scheduled message creation contract', () => {
  const actor = '20000000-0000-4000-8000-000000000002'
  const workspace = '10000000-0000-4000-8000-000000000001'
  const member = '20000000-0000-4000-8000-000000000004'
  const common = { messageType:'attendance',body:'<b>Sunday service</b>',attendeeIds:[member,actor],attendanceGroups:[{id:'30000000-0000-4000-8000-000000000001',label:'Morning'},{id:'30000000-0000-4000-8000-000000000003',label:'Evening'}],followUpMinutes:60,groupChatId:'-100123',threadId:22 }

  it('passes a send-now attendance post and follow-up offset to the schedule RPC', async () => {
    let received: unknown
    setSqlFixture({ queryActor: async (text, values = []) => {
      assert.ok(text.includes('public.create_scheduled_schedule'))
      assert.deepEqual(values.slice(0, 2), [actor, workspace])
      received = JSON.parse(String(values[2])) as unknown
      return []
    } })
    await mutateScheduledMessages(actor, workspace, { op:'schedule.create',data:{...common,sendNow:true} })
    assert.deepEqual(received,{...common,sendNow:true})
  })

  it('accepts an explicitly scheduled occurrence with an inclusive last date', async () => {
    let received: unknown
    setSqlFixture({ queryActor: async (_text, values = []) => { received=JSON.parse(String(values[2])) as unknown; return [] } })
    const schedule={messageType:'announcement',body:'<b>Reminder</b>',attendeeIds:[],attendanceGroups:[],followUpMinutes:null,groupChatId:'-100123',threadId:null,startsOn:'2026-10-04T08:00:00+02:00',frequency:'weekly',untilOn:'2026-11-01'}
    await mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:schedule})
    assert.deepEqual(received,schedule)
  })

  it('rejects normalized-invalid calendar dates in scheduled instants', async () => {
    setSqlFixture({ queryActor: async () => { throw new Error('Unexpected database call') } })
    await assert.rejects(mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:{messageType:'announcement',body:'Reminder',groupChatId:'-100123',startsOn:'2026-02-30T08:00:00+02:00',frequency:'once'}}),/Invalid scheduled date and time/)
  })

  it('rejects removed template, title, expiry and auto-send inputs before database work', async () => {
    setSqlFixture({ queryActor: async () => { throw new Error('Unexpected database call') } })
    for(const key of ['templateId','fields','title','instructions','requireArrival','expiresAt','expiryHours','autoSend','timezone']) {
      await assert.rejects(mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:{messageType:'announcement',body:'Reminder',groupChatId:'-100123',sendNow:true,[key]:'legacy'}}),new RegExp(`Unsupported scheduled message input: ${key}`))
    }
  })

  it('rejects malformed message modes, duplicate recipients, missing follow-up and unsupported body tokens', async () => {
    setSqlFixture({ queryActor: async () => { throw new Error('Unexpected database call') } })
    await assert.rejects(mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:{...common,attendeeIds:[member,member],sendNow:true}}),/Attendees cannot be duplicated/)
    await assert.rejects(mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:{...common,followUpMinutes:null,sendNow:true}}),/Follow-up must be/)
    await assert.rejects(mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:{...common,body:'{{unsupported}}',sendNow:true}}),/explicit date and time values/)
    await assert.rejects(mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:{...common,sendNow:true,startsOn:null}}),/cannot include schedule dates/)
  })

  it('validates follow-up delay edits only on attendance primary occurrences', async () => {
    let occurrence={id:'30000000-0000-4000-8000-000000000009',workspace_id:workspace,message_type:'attendance',post_role:'primary',revision:4,state:'sent'}
    const calls:string[]=[]
    setSqlFixture({
      queryRows:async(text:string)=>text.includes('FROM public.scheduled_message_occurrences')?[occurrence as QueryResultRow]:[],
      queryActor:async(text:string)=>{calls.push(text);return []},
    })
    const edit=(field:string,value:string,scope='occurrence')=>mutateScheduledMessages(actor,workspace,{op:'occurrence.edit',data:{id:occurrence.id,revision:4,field,value,scope}})
    await assert.rejects(edit('followUpMinutes','0'),/Follow-up must be/)
    await assert.rejects(edit('followUpMinutes','60.5'),/Follow-up must be/)
    await edit('followUpMinutes','60')
    assert.equal(calls.some(text=>text.includes('change_scheduled_occurrence')),true)
    calls.length=0
    occurrence={...occurrence,post_role:'follow_up',state:'scheduled'}
    await assert.rejects(edit('sendOn','2026-10-04T08:00:00+02:00'),/Only an unsent primary occurrence can be moved/)
    occurrence={...occurrence,post_role:'primary'}
    await assert.rejects(edit('sendOn','2026-10-04T08:00:00+02:00','future'),/Only an unsent primary occurrence can be moved/)
    assert.equal(calls.some(text=>text.includes('change_scheduled_occurrence')),false)
  })
})

describe('scheduled history', () => {
  it('includes sent, cancelled and failed rows without querying expiry state', async () => {
    let sql=''
    setSqlFixture({queryRows:async(text:string)=>{sql=text;return []}})
    await listHistory('10000000-0000-4000-8000-000000000001')
    assert.match(sql,/o\.state IN \('sent','cancelled','unknown'\)/)
    assert.match(sql,/o\.last_sync_error IS NOT NULL/)
    assert.ok(!sql.includes('expires_at'))
  })
})
