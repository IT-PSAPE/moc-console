import assert from 'node:assert/strict'
import { it as runnerIt } from 'vitest'
import type { ApiResponse } from '../../../../../apps/api/server/http.js'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'
import { authCookieHeaders, configureAuthSessionTestEnvironment, withAuthSessionResponse } from '../../auth-test-session.js'

function it(name:string,test:()=>Promise<void>):void { runnerIt(name,()=>runWithSqlFixture(test)) }
const {handleScheduledMessages}=await import('../../../../../apps/api/server/scheduled-messages/handler.js')

const groups = [
    { id: '10000000-0000-4000-8000-000000000001', label: 'Noon' },
    { id: '10000000-0000-4000-8000-000000000002', label: 'Evening' },
]
async function saveTemplate(messageType: string, attendanceGroups: unknown): Promise<{ status: number; body: unknown; writes: Record<string, unknown>[] }> {
    const originalFetch = globalThis.fetch
    const savedOrigins = process.env.ALLOWED_ORIGINS
    const cleanupAuth=configureAuthSessionTestEnvironment()
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173'
    let status = 200
    let body: unknown
    const writes: Record<string, unknown>[] = []
    setSqlFixture({
        queryRows:async(text:string)=>{ if(text.includes('scheduled_message_occurrences'))return [];return [] },
        queryActor:async(text:string,values:readonly unknown[]=[])=>{
            if(text.includes('SELECT EXISTS('))return [{allowed:true}]
            if(text.includes('save_scheduled_template')){const pData=JSON.parse(String(values[2])) as Record<string,unknown>;writes.push({p_data:pData});return [{save_scheduled_template:'template'}]}
            return []
        },
    })
    globalThis.fetch = withAuthSessionResponse(async()=>new Response(JSON.stringify({ok:true,result:true}),{status:200}), '20000000-0000-4000-8000-000000000002')
    try {
        const response: ApiResponse = { status(code) { status = code; return response }, json(value) { body = value }, setHeader() {} }
        await handleScheduledMessages({ method: 'POST', headers: { ...authCookieHeaders }, body: {
            workspaceId: '10000000-0000-4000-8000-000000000099', op: 'template.save',
            data: { name: 'Service', messageType, body: '{{title}}', fields: { title: 'Service' }, audience: [], attendanceGroups },
        } }, response)
        return { status, body, writes }
    } finally {
        globalThis.fetch = originalFetch
        cleanupAuth()
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
