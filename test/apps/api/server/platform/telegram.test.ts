import { expect, test as runnerTest } from 'vitest'
import type { PoolClient, QueryResultRow } from 'pg'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'
import type { PlatformContext } from '../../../../../apps/api/server/platform/context.js'

const workspaceId='10000000-0000-4000-8000-000000000001'
const actorId='20000000-0000-4000-8000-000000000002'
const workspaceTimezone='Africa/Johannesburg'
function test(name:string,body:()=>Promise<void>):void { runnerTest(name,()=>runWithSqlFixture(async()=>{setSqlFixture({queryRows:async()=>[]});await body()})) }
const {operations}=await import('../../../../../apps/api/server/platform/telegram.js')

function context(calls:Array<{text:string;values:readonly unknown[]}>):PlatformContext {
  const db={query:async(text:string,values:readonly unknown[]=[])=>{
    calls.push({text,values})
    return {rows:[] as QueryResultRow[],rowCount:0}
  }} as unknown as PoolClient
  return {db,userId:actorId,workspaceId}
}

function snapshotResult():Record<string,unknown> {
  return {occurrences:[],schedules:[],memberTypes:[],groups:[],members:[],workspaceTimezone}
}

test('scheduled snapshot calls the authoritative workspace timezone function without running worker materialization',async()=>{
  const queryCalls:Array<{text:string;values:readonly unknown[]}> = []
  const transactionCalls:Array<{text:string;values:readonly unknown[]}> = []
  setSqlFixture({queryRows:async(text,values=[])=>{
    queryCalls.push({text,values})
    return text.includes('public.workspace_timezone')?[{workspace_timezone:workspaceTimezone} as QueryResultRow]:[]
  }})
  const result=await operations['scheduled.snapshot']!.run(context(transactionCalls),{})
  expect(result).toEqual(snapshotResult())
  const timezoneRead=queryCalls.find(call=>call.text.includes('public.workspace_timezone'))
  expect(timezoneRead?.text).toMatch(/SELECT\s+public\.workspace_timezone\(\$1\)\s+AS\s+workspace_timezone/i)
  expect(timezoneRead?.values).toEqual([workspaceId])
  expect(queryCalls.every(call=>call.values.includes(workspaceId))).toBe(true)
  expect(queryCalls.some(call=>call.text.includes('materialize_scheduled_messages'))).toBe(false)
  expect(transactionCalls).toEqual([])
})

test('scheduled mutations invoke the named create function inside the authenticated request transaction',async()=>{
  const transactionCalls:Array<{text:string;values:readonly unknown[]}> = []
  setSqlFixture({queryRows:async(text)=>text.includes('public.workspace_timezone')?[{workspace_timezone:workspaceTimezone} as QueryResultRow]:[]})
  const data={messageType:'announcement',body:'Reminder',attendeeIds:[],attendanceGroups:[],followUpMinutes:null,groupChatId:'-100123',threadId:null,sendNow:true}
  const result=await operations['scheduled.mutate']!.run(context(transactionCalls),{op:'schedule.create',data})
  expect(result).toEqual(snapshotResult())
  const create=transactionCalls.find(call=>call.text.includes('public.create_scheduled_schedule'))
  expect(create?.values.slice(0,2)).toEqual([actorId,workspaceId])
  expect(JSON.parse(String(create?.values[2]))).toEqual(data)
  expect(transactionCalls.some(call=>call.text.includes('materialize_scheduled_messages'))).toBe(false)
})

test('scheduled history is a bounded workspace-scoped read under the management gate',async()=>{
  const calls:Array<{text:string;values:readonly unknown[]}> = []
  setSqlFixture({queryRows:async(text,values=[])=>{
    calls.push({text,values})
    return text.includes('public.workspace_timezone')?[{workspace_timezone:workspaceTimezone} as QueryResultRow]:[]
  }})
  await operations['scheduled.snapshot']!.run(context([]),{view:'history'})
  const historyRead=calls.find(call=>call.text.includes('FROM public.scheduled_message_occurrences'))
  expect(operations['scheduled.snapshot']!.permission).toBe('can_update')
  expect(historyRead?.values).toEqual([workspaceId,null,null])
  expect(historyRead?.text).toContain('o.workspace_id=$1')
  expect(historyRead?.text).toContain("o.state IN ('sent','cancelled','unknown')")
  expect(historyRead?.text).toContain('o.last_sync_error IS NOT NULL')
  expect(historyRead?.text).not.toContain('expires_at')
  expect(historyRead?.text).toContain('ORDER BY o.send_on DESC,o.id DESC LIMIT 101')
  expect(calls.some(call=>call.text.includes('materialize_scheduled_messages'))).toBe(false)
})

test('default scheduled snapshot filters active rows without expiry and rejects unsupported views',async()=>{
  const calls:Array<{text:string;values:readonly unknown[]}> = []
  setSqlFixture({queryRows:async(text,values=[])=>{
    calls.push({text,values})
    return text.includes('public.workspace_timezone')?[{workspace_timezone:workspaceTimezone} as QueryResultRow]:[]
  }})
  await operations['scheduled.snapshot']!.run(context([]),{})
  const activeRead=calls.find(call=>call.text.includes('FROM public.scheduled_message_occurrences'))
  expect(activeRead?.text).toContain("s.enabled AND o.state IN ('scheduled','sending')")
  expect(activeRead?.text).not.toContain('expires_at')
  expect(activeRead?.text).toContain('LIMIT 500')
  await expect(operations['scheduled.snapshot']!.run(context([]),{view:'everything'})).rejects.toThrow('Invalid scheduled message view')
})

test('scheduled history cursor preserves microsecond ties and exposes pages beyond 100 occurrences',async()=>{
  const ids=Array.from({length:101},(_,index)=>`30000000-0000-4000-8000-${String(101-index).padStart(12,'0')}`)
  const sendOn='2026-01-01T12:00:00.123456Z'
  const row=(id:string)=>({id,cursor_send_on:sendOn,send_on:sendOn,state:'cancelled'}) as QueryResultRow
  const calls:Array<{text:string;values:readonly unknown[]}> = []
  setSqlFixture({queryRows:async(text,values=[])=>{
    calls.push({text,values})
    if(text.includes('public.workspace_timezone')) return [{workspace_timezone:workspaceTimezone} as QueryResultRow]
    if(!text.includes('FROM public.scheduled_message_occurrences')) return []
    return values[2]===null?ids.map(row):[row(ids[100]!)]
  }})
  const first=await operations['scheduled.snapshot']!.run(context([]),{view:'history'}) as {occurrences:Array<{id:string}>;nextHistoryCursor:string}
  expect(first.occurrences).toHaveLength(100)
  expect(first.occurrences.every(item=>!('cursor_send_on' in item))).toBe(true)
  const cursor=JSON.parse(Buffer.from(first.nextHistoryCursor,'base64url').toString('utf8')) as {workspaceId:string;sendOn:string;id:string}
  expect(cursor).toEqual({workspaceId,sendOn,id:ids[99]})
  const second=await operations['scheduled.snapshot']!.run(context([]),{view:'history',cursor:first.nextHistoryCursor}) as {occurrences:Array<{id:string}>;nextHistoryCursor:string|null}
  expect(second.occurrences.map(item=>item.id)).toEqual([ids[100]])
  expect(second.nextHistoryCursor).toBeNull()
  expect(calls.some(call=>call.values[1]===sendOn&&call.values[2]===ids[99])).toBe(true)
  expect(calls.some(call=>call.text.includes('(o.send_on,o.id)<($2::timestamptz,$3::uuid)'))).toBe(true)
  const otherWorkspaceCursor=Buffer.from(JSON.stringify({workspaceId:'20000000-0000-4000-8000-000000000002',sendOn,id:ids[99]})).toString('base64url')
  await expect(operations['scheduled.snapshot']!.run(context([]),{view:'history',cursor:otherWorkspaceCursor})).rejects.toThrow('Invalid scheduled history cursor')
  await expect(operations['scheduled.snapshot']!.run(context([]),{view:'history',cursor:'not-json'})).rejects.toThrow('Invalid scheduled history cursor')
})
