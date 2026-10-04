import assert from 'node:assert/strict'
import { it as bunIt } from 'bun:test'
import type { QueryResultRow } from 'pg'
import type { ApiResponse } from '../../../../../apps/api/server/http.js'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'
import { authCookieHeaders, configureAuthSessionTestEnvironment, withAuthSessionResponse } from '../../auth-test-session.js'

function it(name:string,body:()=>Promise<void>):void { bunIt(name,()=>runWithSqlFixture(body)) }
const {handleScheduledMessages}=await import('../../../../../apps/api/server/scheduled-messages/handler.js')
const workspace = '10000000-0000-4000-8000-000000000001'
const occurrence = '30000000-0000-4000-8000-000000000001'
type ActionOptions = { permitted?: boolean; foreign?: boolean; revision?: unknown; op?: string; scope?: string; cleanupError?: string }
async function requestOccurrenceAction(options: ActionOptions = {}) {
    const originalFetch=globalThis.fetch
    const cleanupAuth=configureAuthSessionTestEnvironment()
    const previousOrigins=process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS='http://localhost:5173'
    const calls: { name: string; body: unknown }[] = []
    setSqlFixture({
        queryRows:async(text:string):Promise<QueryResultRow[]>=>{
            if(text.includes('FROM public.scheduled_message_occurrences')&&text.includes('WHERE id=$1'))return [{id:occurrence,workspace_id:options.foreign?'another-workspace':workspace,schedule_id:'schedule-1',state:'sent',revision:7,telegram_message_id:700,last_sync_error:options.cleanupError??null,fields:{title:'Test'},message_type:'announcement',expires_at:new Date(Date.now()+60_000).toISOString()}]
            return []
        },
        queryActor:async(text:string,values:readonly unknown[]=[])=>{
            if(text.includes('SELECT EXISTS('))return [{allowed:options.permitted!==false}]
            const name=text.match(/public\.([a-z_]+)\s*\(/)?.[1]??'unknown'
            if(name.startsWith('request_scheduled_')||name==='delete_scheduled_occurrence')calls.push({name,body:{p_actor:values[0],p_id:values[1],...(name==='request_scheduled_resend'?{p_revision:values[2]}:{}),...(name==='delete_scheduled_occurrence'?{p_revision:values[2],p_scope:values[3]}:{})}})
            if(name==='delete_scheduled_occurrence')return [{delete_scheduled_occurrence:[occurrence]}]
            return [{[name]:null}]
        },
    })
    globalThis.fetch=withAuthSessionResponse(async()=>new Response(JSON.stringify({ok:true,result:true}),{status:200}),'20000000-0000-4000-8000-000000000002')
    let status = 200
    const response: ApiResponse = { status(code) { status = code; return response }, json() {}, setHeader() {} }
    try {
        await handleScheduledMessages({ method: 'POST', headers: { ...authCookieHeaders }, body: {
            workspaceId: workspace, op: options.op ?? 'occurrence.resend', data: { id: occurrence, revision: options.revision === undefined ? 7 : options.revision, scope: options.scope ?? 'occurrence' },
        } }, response)
        return { status, calls }
    } finally {
        globalThis.fetch=originalFetch
        cleanupAuth()
        if(previousOrigins===undefined)delete process.env.ALLOWED_ORIGINS
        else process.env.ALLOWED_ORIGINS=previousOrigins
    }
}

it('requests a revision-checked resend through the authenticated management endpoint', async () => {
    const result = await requestOccurrenceAction()
    assert.equal(result.status, 200)
    assert.deepEqual(result.calls.filter(call => call.name === 'request_scheduled_resend'), [{ name: 'request_scheduled_resend', body: { p_actor: '20000000-0000-4000-8000-000000000002', p_id: occurrence, p_revision: 7 } }])
})
it('rejects a viewer before requesting a resend', async () => {
    const result = await requestOccurrenceAction({ permitted: false })
    assert.equal(result.status, 403)
    assert.equal(result.calls.length, 0)
})
it('rejects resending an occurrence from another workspace', async () => {
    const result = await requestOccurrenceAction({ foreign: true })
    assert.equal(result.status, 403)
    assert.equal(result.calls.length, 0)
})
it('rejects a resend without a numeric occurrence revision', async () => {
    const result = await requestOccurrenceAction({ revision: '7' })
    assert.equal(result.status, 400)
    assert.equal(result.calls.length, 0)
})
it('deletes an occurrence using the authenticated actor, revision and explicit scope', async () => {
    const result = await requestOccurrenceAction({ op: 'occurrence.delete', scope: 'future' })
    assert.equal(result.status, 200)
    assert.deepEqual(result.calls.filter(call => call.name === 'delete_scheduled_occurrence'), [{ name: 'delete_scheduled_occurrence', body: { p_actor: '20000000-0000-4000-8000-000000000002', p_id: occurrence, p_revision: 7, p_scope: 'future' } }])
})
it('rejects invalid deletion scopes before calling the mutation', async () => {
    const result = await requestOccurrenceAction({ op: 'occurrence.delete', scope: 'everything' })
    assert.equal(result.status, 400)
    assert.equal(result.calls.length, 0)
})
it('rejects deleting foreign-workspace messages and viewer deletion', async () => {
    for (const options of [{ foreign: true }, { permitted: false }]) {
        const result = await requestOccurrenceAction({ ...options, op: 'occurrence.delete' })
        assert.equal(result.status, 403)
        assert.equal(result.calls.length, 0)
    }
})
it('reports a Telegram cleanup failure so the confirmed delete can be retried', async () => {
    const result = await requestOccurrenceAction({ op: 'occurrence.delete', cleanupError: 'Bot removed from group' })
    assert.equal(result.status, 400)
    assert.equal(result.calls.filter(call => call.name === 'delete_scheduled_occurrence').length, 1)
})
