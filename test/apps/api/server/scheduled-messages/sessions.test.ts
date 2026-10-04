import { describe, expect, test as bunTest } from 'bun:test'
import type { QueryResultRow } from 'pg'
import type { MessageSession } from '../../../../../apps/api/server/scheduled-messages/types'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'

function test(name:string,body:()=>Promise<void>):void { bunTest(name,()=>runWithSqlFixture(body)) }

const sql: string[] = []
let session: MessageSession | null = null
let linkedId = 'user-1'
let canUpdate = true
let permissionReads = 0

function configureSqlFixture():void {
  const queryRows=async(text:string):Promise<QueryResultRow[]>=>{
    sql.push(text)
    if (text.includes('FROM public.scheduled_message_sessions')) return session ? [session] : []
    if (text.includes('FROM public.users')) return [{ id: linkedId }]
    return []
  }
  const queryActor=async(text:string):Promise<QueryResultRow[]>=>{sql.push(text);permissionReads++;return [{allowed:canUpdate}]}
  setSqlFixture({queryRows,queryActor})
}

const { ownedSession } = await import('../../../../../apps/api/server/scheduled-messages/sessions')

function makeSession(overrides: Partial<MessageSession> = {}): MessageSession {
  return { id:'session-1',user_id:'user-1',telegram_user_id:'456',workspace_id:'workspace-1',chat_id:'-100123',thread_id:22,ephemeral_message_id:81,occurrence_id:'occurrence-1',kind:'admin',data:{},expires_at:new Date(Date.now()+60_000).toISOString(),...overrides }
}
function reset(next = makeSession()): void { configureSqlFixture();sql.length=0; session=next; linkedId='user-1'; canUpdate=true; permissionReads=0 }

describe('scheduled session SQL boundary', () => {
  test('scopes the lookup to owner and origin chat and checks expiry in SQL', async () => {
    reset(null)
    await expect(ownedSession('session-1','999','-100999',81)).rejects.toThrow(/This flow has ended/)
    expect(sql[0]).toContain('id=$1 AND telegram_user_id=$2 AND chat_id=$3 AND expires_at>now()')
    expect(sql).toHaveLength(1)
  })
  test('rejects stale controls before resolving Telegram identity', async () => {
    reset()
    await expect(ownedSession('session-1','456','-100123',999)).rejects.toThrow(/belongs to another interaction/)
    expect(sql).toHaveLength(1)
  })
  test('normalizes PostgreSQL bigint Telegram message IDs before comparing controls', async () => {
    reset(makeSession({ephemeral_message_id:'81' as unknown as number}))
    await expect(ownedSession('session-1','456','-100123',81)).resolves.toMatchObject({ephemeral_message_id:81})
  })
  test('rejects sessions after Telegram linking changes', async () => {
    reset(); linkedId='different-user'
    await expect(ownedSession('session-1','456','-100123',81)).rejects.toThrow(/Telegram link has changed/)
    expect(sql[1]).toContain('FROM public.users WHERE telegram_chat_id=$1')
  })
  test('rechecks management permission for each admin interaction', async () => {
    reset()
    await ownedSession('session-1','456','-100123',81)
    canUpdate=false
    await expect(ownedSession('session-1','456','-100123',81)).rejects.toThrow(/Not authorised/)
    expect(permissionReads).toBe(2)
  })
  test('attendance sessions need membership and identity without manager permission', async () => {
    reset(makeSession({kind:'attendance'}))
    await expect(ownedSession('session-1','456','-100123',81)).resolves.toMatchObject({kind:'attendance'})
    expect(permissionReads).toBe(0)
  })
})
