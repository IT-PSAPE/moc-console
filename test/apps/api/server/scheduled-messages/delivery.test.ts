import { expect, test as bunTest } from 'bun:test'
import type { QueryResultRow } from 'pg'
import { runWithSqlFixture, setSqlFixture } from '../sql-fixture.js'

function test(name:string,body:()=>Promise<void>):void { bunTest(name,()=>runWithSqlFixture(body)) }

type SqlCall = { text: string; values: readonly unknown[] }
const calls: SqlCall[] = []
let deliveryRow: Record<string, unknown>
let beginSnapshot: Record<string, unknown>

function configureSqlFixture():void {
  const queryRows = async (text: string, values: readonly unknown[] = []):Promise<QueryResultRow[]> => {
    calls.push({ text, values })
    if (text.includes("SELECT id FROM public.notification_deliveries")) return [{ id: deliveryRow.id }]
    if (text.includes("UPDATE public.notification_deliveries SET status='processing'")) return [deliveryRow]
    return []
  }
  const queryActor = async(text:string,values:readonly unknown[]=[])=>{
    calls.push({text,values})
    if(text.includes('begin_scheduled_delivery'))return [{result:beginSnapshot}]
    if(text.includes('finish_scheduled_delivery'))return [{finish_scheduled_delivery:null}]
    return []
  }
  setSqlFixture({queryRows,queryActor})
}

const { processPendingScheduledDeliveries } = await import('../../../../../apps/api/server/notifications/delivery-store.js')

function setup(): void {
  configureSqlFixture()
  calls.length = 0
  deliveryRow = {
    id:'delivery-1',workspace_id:'workspace-1',event_key:'scheduled:occurrence-1',event_type:null,scope:'group',route_id:null,
    recipient_user_id:null,destination_key:'group:-1001:42',chat_id:'-1001',thread_id:42,text:'unused',payload:{},attempt_count:0,
    entity_type:null,entity_id:null,reply_markup:null,parent_delivery_id:null,scheduled_operation:'send',
  }
  beginSnapshot = {
    occurrence:{id:'occurrence-1',workspace_id:'workspace-1',schedule_id:'schedule-1',occurrence_on:'2026-10-04',send_on:'2026-10-04T08:00:00Z',expires_at:'2026-10-04T12:00:00Z',fields:{title:'Service briefing'},body:'<b>{{title}}</b>',message_type:'announcement',require_arrival:false,attendance_groups:[],state:'scheduled',revision:3,telegram_message_id:null,last_sync_error:null},
    responses:[],expired:false,timezone:'UTC',
  }
}

test('scheduled send with no returned Telegram message ID is marked ambiguous and terminal', async () => {
  setup()
  const previousFetch=globalThis.fetch
  const previousToken=process.env.TELEGRAM_BOT_TOKEN
  process.env.TELEGRAM_BOT_TOKEN='test-token'
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,result:{}}),{status:200})
  try {
    await expect(processPendingScheduledDeliveries()).resolves.toEqual({attempted:1,sent:0,failed:1,pendingRetry:0})
    const finish=calls.find(call=>call.text.includes('finish_scheduled_delivery'))
    expect(finish?.values[4]).toBe(true)
    const update=calls.find(call=>call.text.includes("UPDATE public.notification_deliveries SET status=$2"))
    expect(update?.values[1]).toBe('failed')
  } finally {
    globalThis.fetch=previousFetch
    if(previousToken===undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN=previousToken
  }
})

test('scheduled send claims and finalizes through named SQL functions with the occurrence revision', async () => {
  setup()
  const previousFetch=globalThis.fetch
  const previousToken=process.env.TELEGRAM_BOT_TOKEN
  process.env.TELEGRAM_BOT_TOKEN='test-token'
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,result:{message_id:901}}),{status:200})
  try {
    await expect(processPendingScheduledDeliveries()).resolves.toEqual({attempted:1,sent:1,failed:0,pendingRetry:0})
    expect(calls.some(call=>call.text.includes('UPDATE public.notification_deliveries SET status=\'processing\'') && call.text.includes('RETURNING'))).toBe(true)
    const begin=calls.find(call=>call.text.includes('begin_scheduled_delivery'))
    const finish=calls.find(call=>call.text.includes('finish_scheduled_delivery'))
    expect(begin?.values).toEqual(['delivery-1'])
    expect(finish?.values.slice(0,3)).toEqual(['delivery-1',3,901])
  } finally {
    globalThis.fetch=previousFetch
    if(previousToken===undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN=previousToken
  }
})

test('resend renders the current message and saved attendance into a new Telegram post', async () => {
  setup()
  deliveryRow.scheduled_operation='resend'
  const occurrence=beginSnapshot.occurrence as Record<string,unknown>
  occurrence.state='sent'
  occurrence.message_type='pre_attendance'
  occurrence.telegram_message_id=700
  occurrence.body='<b>{{title}}</b>\n{{date}} {{time}}\n{{instructions}}'
  occurrence.fields={title:'Service briefing',instructions:'Meet at the entrance'}
  occurrence.require_arrival=true
  occurrence.attendance_groups=[{id:'10000000-0000-4000-8000-000000000001',label:'Noon'},{id:'10000000-0000-4000-8000-000000000002',label:'Evening'}]
  beginSnapshot.responses=[{name:'Alex Member',status:'attending',arrival_time:'07:30',group_id:'10000000-0000-4000-8000-000000000001'}]
  let body:Record<string,unknown>|null=null
  const previousFetch=globalThis.fetch
  const previousToken=process.env.TELEGRAM_BOT_TOKEN
  process.env.TELEGRAM_BOT_TOKEN='test-token'
  globalThis.fetch=async(_input,init)=>{body=JSON.parse(String(init?.body)) as Record<string,unknown>;return new Response(JSON.stringify({ok:true,result:{message_id:902}}),{status:200})}
  try {
    const result=await processPendingScheduledDeliveries()
    expect(result).toEqual({attempted:1,sent:1,failed:0,pendingRetry:0})
    expect(body?.message_id).toBeUndefined()
    expect(JSON.stringify(body)).toContain('Service briefing')
    expect(JSON.stringify(body)).toContain('Noon')
    expect(JSON.stringify(body)).toContain('✅ Alex Member — 07:30')
    const finish=calls.find(call=>call.text.includes('finish_scheduled_delivery'))
    expect(finish?.values.slice(0,3)).toEqual(['delivery-1',3,902])
    expect(finish?.values[4]).toBe(false)
  } finally {
    globalThis.fetch=previousFetch
    if(previousToken===undefined)delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN=previousToken
  }
})

test('a resend with an ambiguous Telegram result is terminal and never queued for automatic retry', async () => {
  setup()
  deliveryRow.scheduled_operation='resend'
  const occurrence=beginSnapshot.occurrence as Record<string,unknown>
  occurrence.state='sent'
  occurrence.telegram_message_id=700
  const previousFetch=globalThis.fetch
  const previousToken=process.env.TELEGRAM_BOT_TOKEN
  process.env.TELEGRAM_BOT_TOKEN='test-token'
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,result:{}}),{status:200})
  try {
    await expect(processPendingScheduledDeliveries()).resolves.toEqual({attempted:1,sent:0,failed:1,pendingRetry:0})
    const finish=calls.find(call=>call.text.includes('finish_scheduled_delivery'))
    expect(finish?.values[4]).toBe(true)
    const update=calls.find(call=>call.text.includes('UPDATE public.notification_deliveries SET status=$2'))
    expect(update?.values[1]).toBe('failed')
  } finally {
    globalThis.fetch=previousFetch
    if(previousToken===undefined)delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN=previousToken
  }
})
