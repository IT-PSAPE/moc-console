import { describe, expect, test as runnerTest } from 'vitest'
import type { QueryResultRow } from 'pg'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'

function test(name:string,body:()=>Promise<void>):void { runnerTest(name,()=>runWithSqlFixture(body)) }
const {handleScheduledCallback,handleScheduledMessage}=await import('../../../../../apps/api/server/scheduled-messages/telegram-flow.js')

type ResponseRow={user_id:string;name:string;status:'awaiting'|'attending'|'not_attending';arrival_time:string|null;group_id:string|null;decline_reason:string|null;checked_in_at:string|null}
type OccurrenceRow=Record<string,unknown>
type TelegramCall={method:string;body:Record<string,unknown>}

function createFixture(options:{groups?:Array<{id:string;label:string}>;userId?:string;primaryLegacyClosed?:boolean;childLegacyClosed?:boolean}={}) {
  const previousFetch=globalThis.fetch
  const previousToken=process.env.TELEGRAM_BOT_TOKEN
  process.env.TELEGRAM_BOT_TOKEN='test-token'
  const calls:TelegramCall[]=[]
  const rpcCalls:Array<{name:string;values:readonly unknown[]}> = []
  const databaseCalls:Array<{text:string;values:readonly unknown[]}> = []
  const sessionRows=new Map<string,Record<string,unknown>>()
  const groupChatId='-100123'
  const memberId=options.userId??'user-1'
  const primary:OccurrenceRow={id:'occurrence-1',workspace_id:'workspace-1',schedule_id:'schedule-1',occurrence_on:'2026-10-03',send_on:'2026-10-03T08:00:00.000Z',post_role:'primary',parent_occurrence_id:null,legacy_closed:options.primaryLegacyClosed??false,message_type:'attendance',body:'<b>Sunday service</b>',attendee_ids:[memberId],attendance_groups:options.groups??[],state:'sent',revision:3,synced_revision:3,telegram_message_id:700,last_sync_error:null}
  const child:OccurrenceRow={...primary,id:'30000000-0000-4000-8000-000000000009',post_role:'follow_up',parent_occurrence_id:primary.id,legacy_closed:options.childLegacyClosed??false,send_on:'2026-10-03T09:00:00.000Z',telegram_message_id:701}
  const schedule:Record<string,unknown>={id:'schedule-1',workspace_id:'workspace-1',message_type:'attendance',body:'<b>Sunday service</b>',attendee_ids:[memberId],attendance_groups:options.groups??[],group_chat_id:groupChatId,thread_id:22,starts_on:'2026-10-03',send_time:'08:00',until_on:null,frequency:'once',timezone:'Africa/Johannesburg',follow_up_minutes:60,enabled:true}
  const responses:ResponseRow[]=[{user_id:memberId,name:'Alex Member',status:'awaiting',arrival_time:null,group_id:null,decline_reason:null,checked_in_at:null}]
  const canonicalCheckIn='2026-10-03T09:15:00.000Z'
  let nextEphemeralId=500

  const queryRows=async(text:string,values:readonly unknown[]=[]):Promise<QueryResultRow[]>=>{
    databaseCalls.push({text,values})
    if(text.includes('public.scheduled_message_sessions')) {
      if(text.startsWith('INSERT')) {
        const row={id:values[0],user_id:values[1],telegram_user_id:values[2],workspace_id:values[3],chat_id:values[4],thread_id:values[5],ephemeral_message_id:null,occurrence_id:values[6],kind:values[7],data:JSON.parse(String(values[8])),expires_at:new Date(Date.now()+60_000).toISOString()}
        for(const [id,old] of sessionRows) if(old.telegram_user_id===row.telegram_user_id&&old.chat_id===row.chat_id) sessionRows.delete(id)
        sessionRows.set(String(row.id),row)
        return [row as QueryResultRow]
      }
      if(text.startsWith('UPDATE')) {
        const row=sessionRows.get(String(values[0]))
        if(row) {
          if(values[2]===true) row.occurrence_id=values[3]
          if(values[4]===true) row.ephemeral_message_id=values[5]
          if(values[1]!==null) row.data=JSON.parse(String(values[1]))
        }
        return []
      }
      if(text.startsWith('DELETE')) {sessionRows.delete(String(values[0]));return []}
      if(text.includes('data @>')) {
        const filter=JSON.parse(String(values[2])) as Record<string,unknown>
        const row=[...sessionRows.values()].find(item=>item.telegram_user_id===values[0]&&item.chat_id===values[1]&&Object.entries(filter).every(([key,value])=>(item.data as Record<string,unknown>)[key]===value))
        return row?[row as QueryResultRow]:[]
      }
      if(text.includes('WHERE telegram_user_id=$1')) {
        const row=[...sessionRows.values()].find(item=>item.telegram_user_id===values[0]&&item.chat_id===values[1])
        return row?[row as QueryResultRow]:[]
      }
      const row=sessionRows.get(String(values[0]))
      return row&&row.telegram_user_id===values[1]&&row.chat_id===values[2]?[row as QueryResultRow]:[]
    }
    if(text.includes('SELECT r.user_id,r.name,r.status')) return responses.map(row=>({...row}) as QueryResultRow)
    if(text.includes('FROM public.users WHERE telegram_chat_id')) return [{id:memberId} as QueryResultRow]
    if(text.includes('FROM public.telegram_groups')) return [{workspace_id:'workspace-1'} as QueryResultRow]
    if(text.includes('FROM public.workspace_users')) return [{user_id:memberId} as QueryResultRow]
    if(text.includes('FROM public.scheduled_message_occurrences o JOIN public.scheduled_message_schedules s')) {
      if(text.includes('FOR UPDATE OF o')) return [{workspace_id:child.workspace_id,group_chat_id:groupChatId,post_role:child.post_role,message_type:child.message_type,parent_occurrence_id:child.parent_occurrence_id,state:child.state,legacy_closed:child.legacy_closed,telegram_message_id:child.telegram_message_id} as QueryResultRow]
      return [{id:child.id,parent_occurrence_id:child.parent_occurrence_id} as QueryResultRow]
    }
    if(text.includes('FROM public.scheduled_message_occurrences WHERE id=$1 FOR UPDATE')) return [{id:primary.id} as QueryResultRow]
    if(text.includes('FROM public.scheduled_message_occurrences requested')) return []
    if(text.includes('FROM public.scheduled_message_occurrences')) {
      const id=String(values[0])
      const row=id===String(child.id)?child:primary
      return [{...row} as QueryResultRow]
    }
    if(text.includes('FROM public.scheduled_message_schedules')) return [{...schedule} as QueryResultRow]
    if(text.includes('FROM public.notification_deliveries')) return []
    return []
  }
  const queryActor=async(text:string,values:readonly unknown[]=[]):Promise<QueryResultRow[]>=>{
    if(text.includes('SELECT EXISTS(SELECT 1 FROM public.workspace_users')) return [{allowed:true} as QueryResultRow]
    const name=text.match(/public\.([a-z_]+)\s*\(/)?.[1]??'unknown'
    databaseCalls.push({text,values})
    rpcCalls.push({name,values})
    if(name==='respond_scheduled_attendance') {
      const response=responses.find(row=>row.user_id===values[0])
      if(response) {
        response.status=String(values[3]) as ResponseRow['status']
        response.arrival_time=typeof values[4]==='string'?String(values[4]):null
        response.group_id=typeof values[5]==='string'?String(values[5]):null
        response.decline_reason=typeof values[6]==='string'?String(values[6]):null
      }
    }
    if(name==='check_in_scheduled_attendance') return [{result:canonicalCheckIn} as QueryResultRow]
    return [{[name]:null} as QueryResultRow]
  }
  setSqlFixture({queryRows,queryActor})

  globalThis.fetch=async(input,init)=>{
    const url=String(input)
    const method=url.split('/').at(-1)??''
    const body=typeof init?.body==='string'?JSON.parse(init.body) as Record<string,unknown>:{}
    calls.push({method,body})
    if(method==='sendMessage') return new Response(JSON.stringify({ok:true,result:{message_id:900,ephemeral_message_id:nextEphemeralId++}}),{status:200})
    if(method==='answerCallbackQuery'||method==='editEphemeralMessageText'||method==='editMessageText'||method==='deleteEphemeralMessage') return new Response(JSON.stringify({ok:true,result:true}),{status:200})
    return new Response(JSON.stringify({ok:false,error_code:500,description:`Unexpected Telegram method ${method}`}),{status:500})
  }

  const answer=(action:string,occurrenceId:string,messageId:number,callbackId=`callback-${action}`)=>handleScheduledCallback({id:callbackId,from:{id:456},data:`sa:${action}:${occurrenceId}`,message:{chat:{id:groupChatId},message_id:messageId,message_thread_id:22}})
  const submitReply=async(value:string)=>{
    const session=[...sessionRows.values()][0]
    const promptId=(session?.data as Record<string,unknown>|undefined)?.promptId
    await handleScheduledMessage({text:value,from:{id:456},chat:{id:groupChatId,type:'supergroup'},message_thread_id:22,ephemeral_message_id:999,reply_to_message:{ephemeral_message_id:promptId as number}})
  }
  const telegramCalls=(method:string)=>calls.filter(call=>call.method===method)
  const teardown=()=>{setSqlFixture({queryRows:async()=>[]});globalThis.fetch=previousFetch;if(previousToken===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=previousToken}
  return {calls,rpcCalls,databaseCalls,primary,child,responses,sessionRows,answer,submitReply,telegramCalls,teardown}
}

describe('scheduled attendance Telegram flow',()=>{
  test('Attending always asks for an expected arrival time before saving the RSVP',async()=>{
    const f=createFixture()
    try {
      await f.answer('yes','occurrence-1',700)
      expect(f.rpcCalls.some(call=>call.name==='respond_scheduled_attendance')).toBe(false)
      expect(f.telegramCalls('sendMessage').map(call=>call.body.text).join('\n')).toContain('expected arrival time')
      await f.submitReply('07:30')
      const save=f.rpcCalls.find(call=>call.name==='respond_scheduled_attendance')
      expect(save?.values).toEqual(['user-1','occurrence-1',3,'attending','07:30',null,null])
      expect(f.responses[0]).toMatchObject({status:'attending',arrival_time:'07:30'})
    } finally {f.teardown()}
  })

  test('attending with group choices selects a group and still requires expected arrival',async()=>{
    const groups=[{id:'30000000-0000-4000-8000-000000000001',label:'Morning'},{id:'30000000-0000-4000-8000-000000000002',label:'Evening'}]
    const f=createFixture({groups})
    try {
      await f.answer('yes','occurrence-1',700,'choose-group')
      expect(f.telegramCalls('sendMessage').at(-1)?.body.text).toContain('Choose your group')
      const session=[...f.sessionRows.values()][0]
      const data=`sm:${String(session?.id)}:group:0`
      await handleScheduledCallback({id:'select-morning',from:{id:456},data,message:{chat:{id:'-100123'},message_id:900,message_thread_id:22,ephemeral_message_id:session?.ephemeral_message_id as number}})
      expect(f.rpcCalls.some(call=>call.name==='respond_scheduled_attendance')).toBe(false)
      expect(f.telegramCalls('editEphemeralMessageText').at(-1)?.body.text).toContain('expected arrival time')
      await f.submitReply('08:15')
      expect(f.rpcCalls.find(call=>call.name==='respond_scheduled_attendance')?.values).toEqual(['user-1','occurrence-1',3,'attending','08:15',groups[0]?.id,null])
    } finally {f.teardown()}
  })

  test('Not attending requires a nonblank reason and persists it separately',async()=>{
    const f=createFixture()
    try {
      await f.answer('no','occurrence-1',700)
      expect(f.telegramCalls('sendMessage').map(call=>call.body.text).join('\n')).toContain('reason for not attending')
      await f.submitReply('Unable to attend')
      expect(f.rpcCalls.find(call=>call.name==='respond_scheduled_attendance')?.values).toEqual(['user-1','occurrence-1',3,'not_attending',null,null,'Unable to attend'])
      expect(f.responses[0]?.decline_reason).toBe('Unable to attend')
    } finally {f.teardown()}
  })

  test('rejects empty or over-limit decline reasons without saving a response',async()=>{
    const f=createFixture()
    try {
      await f.answer('no','occurrence-1',700)
      await f.submitReply('   ')
      await f.submitReply('x'.repeat(501))
      expect(f.rpcCalls.some(call=>call.name==='respond_scheduled_attendance')).toBe(false)
      expect(f.telegramCalls('sendMessage').map(call=>call.body.text).join('\n')).toContain('reason of 1 to 500 characters')
    } finally {f.teardown()}
  })

  test('Attendance buttons record one canonical check-in on the linked child without an ephemeral session',async()=>{
    const f=createFixture()
    try {
      f.responses[0]!.status='not_attending'
      f.responses[0]!.decline_reason='Unable to attend'
      await f.answer('check',String(f.child.id),701)
      await f.answer('check',String(f.child.id),701,'callback-check-retry')
      const check=f.rpcCalls.filter(call=>call.name==='check_in_scheduled_attendance')
      expect(check,JSON.stringify(f.telegramCalls('answerCallbackQuery').map(call=>call.body))).toHaveLength(2)
      expect(check[0]?.values).toEqual(['user-1',f.child.id])
      expect(f.sessionRows.size).toBe(0)
      expect(f.telegramCalls('answerCallbackQuery').at(-1)?.body.callback_query_id).toBe('callback-check-retry')
      const parentLock=f.databaseCalls.findIndex(call=>call.text.includes('FROM public.scheduled_message_occurrences WHERE id=$1 FOR UPDATE'))
      const childLock=f.databaseCalls.findIndex(call=>call.text.includes('FROM public.scheduled_message_occurrences o JOIN public.scheduled_message_schedules s')&&call.text.includes('FOR UPDATE OF o'))
      const checkIn=f.databaseCalls.findIndex(call=>call.text.includes('public.check_in_scheduled_attendance'))
      expect(parentLock).toBeGreaterThanOrEqual(0)
      expect(childLock).toBeGreaterThan(parentLock)
      expect(checkIn).toBeGreaterThan(childLock)
    } finally {f.teardown()}
  })

  test('rejects check-in from a forged Telegram message identity and historical closed callbacks',async()=>{
    const wrongMessage=createFixture()
    try {
      await wrongMessage.answer('check',String(wrongMessage.child.id),999)
      expect(wrongMessage.rpcCalls.some(call=>call.name==='check_in_scheduled_attendance')).toBe(false)
    } finally {wrongMessage.teardown()}
    const closed=createFixture({childLegacyClosed:true})
    try {
      await closed.answer('check',String(closed.child.id),701)
      expect(closed.rpcCalls.some(call=>call.name==='check_in_scheduled_attendance')).toBe(false)
    } finally {closed.teardown()}
  })

  test('rejects primary RSVP callbacks for legacy-closed historical messages',async()=>{
    const f=createFixture({primaryLegacyClosed:true})
    try {
      await f.answer('yes','occurrence-1',700)
      expect(f.rpcCalls.some(call=>call.name==='respond_scheduled_attendance')).toBe(false)
      expect(f.telegramCalls('answerCallbackQuery').at(-1)?.body.show_alert).toBe(true)
    } finally {f.teardown()}
  })
})
