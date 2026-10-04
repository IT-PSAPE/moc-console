import { expect, test as bunTest } from 'bun:test'
import type { PoolClient, QueryResultRow } from 'pg'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'
import type { PlatformContext } from '../../../../../apps/api/server/platform/context.js'

function test(name:string,body:()=>Promise<void>):void { bunTest(name,()=>runWithSqlFixture(async()=>{setSqlFixture({queryRows:async()=>[]});await body()})) }
const {operations}=await import('../../../../../apps/api/server/platform/telegram.js')

function context(calls: Array<{ text:string;values:readonly unknown[] }>):PlatformContext {
  const db={query:async(text:string,values:readonly unknown[]=[])=>{
    calls.push({text,values})
    return {rows:[] as QueryResultRow[],rowCount:0}
  }} as unknown as PoolClient
  return {db,userId:'20000000-0000-4000-8000-000000000002',workspaceId:'10000000-0000-4000-8000-000000000001'}
}

test('scheduled snapshot uses the authenticated request transaction without running worker materialization',async()=>{
  const calls:Array<{text:string;values:readonly unknown[]}>=[]
  const result=await operations['scheduled.snapshot']!.run(context(calls),{})
  expect(result).toEqual({occurrences:[],templates:[],schedules:[],memberTypes:[],groups:[],members:[]})
  expect(calls.every(call=>call.values.includes('10000000-0000-4000-8000-000000000001'))).toBe(true)
  expect(calls.some(call=>call.text.includes('materialize_scheduled_messages'))).toBe(false)
})

test('scheduled mutations invoke the named SQL function inside the authenticated request transaction',async()=>{
  const calls:Array<{text:string;values:readonly unknown[]}>=[]
  const result=await operations['scheduled.mutate']!.run(context(calls),{
    op:'template.save',
    data:{name:'Service',messageType:'announcement',body:'{{title}}',fields:{title:'Service'},audience:[]},
  })
  expect(result).toEqual({occurrences:[],templates:[],schedules:[],memberTypes:[],groups:[],members:[]})
  expect(calls.some(call=>call.text.includes('public.save_scheduled_template'))).toBe(true)
  expect(calls.some(call=>call.text.includes('materialize_scheduled_messages'))).toBe(false)
})
