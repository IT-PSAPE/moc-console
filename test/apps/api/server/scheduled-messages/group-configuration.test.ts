import assert from 'node:assert/strict'
import { it as runnerIt } from 'vitest'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'

function it(name:string,body:()=>Promise<void>):void { runnerIt(name,()=>runWithSqlFixture(body)) }
const {mutateScheduledMessages}=await import('../../../../../apps/api/server/scheduled-messages/handler.js')

const actor='20000000-0000-4000-8000-000000000002'
const workspace='10000000-0000-4000-8000-000000000001'
const groups=[
  {id:'30000000-0000-4000-8000-000000000001',label:'Noon'},
  {id:'30000000-0000-4000-8000-000000000002',label:'Evening'},
]
function data(attendanceGroups:unknown) {
  return {messageType:'attendance',body:'Service',attendeeIds:[actor],attendanceGroups,followUpMinutes:60,groupChatId:'-100123',threadId:null,sendNow:true}
}

it('normalizes labels and retains stable IDs in attendance schedule creation',async()=>{
  let saved:Record<string,unknown>|null=null
  setSqlFixture({queryActor:async(_text,values=[])=>{saved=JSON.parse(String(values[2])) as Record<string,unknown>;return []}})
  await mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:data([{...groups[0],label:' Noon '},groups[1]])})
  assert.deepEqual(saved?.attendanceGroups,groups)
})

it('rejects duplicate group labels and attendance settings on announcements',async()=>{
  setSqlFixture({queryActor:async()=>{throw new Error('Unexpected database write')}})
  await assert.rejects(mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:data([groups[0],{...groups[1],label:'noon'}])}),/unique names and IDs/)
  await assert.rejects(mutateScheduledMessages(actor,workspace,{op:'schedule.create',data:{messageType:'announcement',body:'Reminder',groupChatId:'-100123',sendNow:true,attendanceGroups:groups}}),/only available for attendance messages/)
})
