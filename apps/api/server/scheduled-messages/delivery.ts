import { renderScheduledMessage, toRichHtml } from '@moc/notifications'
import { getSupabaseAdmin } from '../supabase-admin.js'
import { editTelegramRichMessage, sendTelegramRichMessage } from '../telegram.js'
import type { DeliveryRunResult } from '../notifications/delivery-store.js'
import { scheduledRpc } from './store.js'
import type { AttendanceResponse, Occurrence } from './types.js'

export type ScheduledDelivery = { id: string; chat_id: string; thread_id: number|null; attempt_count: number; scheduled_operation: 'send'|'edit'|'expire' }
type DeliverySnapshot = { busy?: boolean; occurrence: Occurrence; responses: AttendanceResponse[]; expired: boolean }

export async function deliverScheduledMessage(row: ScheduledDelivery): Promise<DeliveryRunResult> {
  const total: DeliveryRunResult = {attempted:1,sent:0,failed:0,pendingRetry:0}
  const admin=getSupabaseAdmin()
  let snapshot:DeliverySnapshot|null
  try {
    snapshot=await scheduledRpc('begin_scheduled_delivery',{p_delivery:row.id}) as DeliverySnapshot|null
  } catch(error) {
    // Invalid/removed destinations must not abort the whole daily batch.
    const description=error instanceof Error?error.message:'Delivery preparation failed'
    const terminal=description.includes('unavailable') || row.attempt_count>=4
    const {error:saveError}=await admin.from('notification_deliveries').update({status:terminal?'failed':'pending',last_error:description,attempt_count:row.attempt_count+1,next_attempt_at:new Date(Date.now()+86400_000).toISOString()}).eq('id',row.id)
    if(saveError) throw new Error(saveError.message)
    const {data}=await admin.from('notification_deliveries').select('scheduled_occurrence_id').eq('id',row.id).single()
    if(data?.scheduled_occurrence_id) await admin.from('scheduled_message_occurrences').update({last_sync_error:description}).eq('id',data.scheduled_occurrence_id)
    total.failed=1
    total.pendingRetry=terminal?0:1
    return total
  }
  if(!snapshot) return total
  if(snapshot.busy) {
    await admin.from('notification_deliveries').update({status:'pending',next_attempt_at:new Date(Date.now()+10_000).toISOString()}).eq('id',row.id)
    return total
  }
  const o=snapshot.occurrence
  const responses=snapshot.responses.map(r=>({name:r.name,status:r.status,arrivalTime:r.arrival_time,groupId:r.group_id}))
  let result
  try {
    const rendered=renderScheduledMessage({id:o.id,messageType:o.message_type,body:o.body,fields:o.fields,requireArrival:o.require_arrival,attendanceGroups:o.attendance_groups},responses,snapshot.expired)
    result=row.scheduled_operation==='send'
      ? await sendTelegramRichMessage(row.chat_id,toRichHtml(rendered.text),{threadId:row.thread_id,replyMarkup:rendered.replyMarkup})
      : await editTelegramRichMessage(row.chat_id,o.telegram_message_id!,toRichHtml(rendered.text),rendered.replyMarkup ?? {inline_keyboard:[]})
  } catch(error) {
    result={ok:false as const,errorCode:400,description:error instanceof Error?error.message:'Rendering failed',retryAfterSeconds:null}
  }
  const missingId=result.ok && row.scheduled_operation==='send' && !result.result?.message_id
  const error=result.ok ? (missingId?'Telegram accepted the send without a message ID':null) : result.description
  const ambiguous=row.scheduled_operation==='send' && (missingId || (!result.ok && result.errorCode===null && !('requestStarted' in result && result.requestStarted===false)))
  await scheduledRpc('finish_scheduled_delivery',{p_delivery:row.id,p_revision:o.revision,p_message:result.ok?result.result?.message_id??null:null,p_error:error,p_ambiguous:ambiguous})
  const failed=error!==null
  const terminal=ambiguous || row.attempt_count>=4 || (!result.ok && [400,403,404].includes(result.errorCode??0))
  const {error:saveError}=await admin.from('notification_deliveries').update({
    status:failed?(terminal?'failed':'pending'):'sent',attempt_count:row.attempt_count+1,
    last_error:error,next_attempt_at:new Date(Date.now()+Math.max(86400,(!result.ok?result.retryAfterSeconds:0)??0)*1000).toISOString(),
    sent_at:failed?null:new Date().toISOString(),telegram_message_id:result.ok?result.result?.message_id??o.telegram_message_id:null,
  }).eq('id',row.id)
  if(saveError) throw new Error(saveError.message)
  if(failed) {total.failed=1;total.pendingRetry=terminal?0:1} else total.sent=1
  return total
}
