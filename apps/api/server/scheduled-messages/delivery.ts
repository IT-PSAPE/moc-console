import { renderScheduledMessage, toRichHtml } from '@moc/notifications'
import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'
import { editTelegramRichMessage, sendTelegramRichMessage } from '../telegram.js'
import type { DeliveryRunResult } from '../notifications/delivery-store.js'
import { scheduledRpc } from './store.js'
import { deleteScheduledTelegramMessage } from './delete-telegram-message.js'
import type { AttendanceResponse, Occurrence } from './types.js'

export type ScheduledDelivery = { id: string; chat_id: string; thread_id: number|null; attempt_count: number; scheduled_operation: 'send'|'resend'|'edit'|'expire'|'delete' }
type DeliverySnapshot = { busy?: boolean; occurrence: Occurrence; responses: AttendanceResponse[]; expired: boolean; timezone?: string }

export async function deliverScheduledMessage(row: ScheduledDelivery): Promise<DeliveryRunResult> {
  const total: DeliveryRunResult = {attempted:1,sent:0,failed:0,pendingRetry:0}
  let snapshot:DeliverySnapshot|null
  try {
    snapshot=await scheduledRpc('begin_scheduled_delivery',{p_delivery:row.id}) as DeliverySnapshot|null
  } catch(error) {
    // Invalid/removed destinations must not abort the whole worker batch.
    const description=error instanceof Error?error.message:'Delivery preparation failed'
    const terminal=description.includes('unavailable') || row.attempt_count>=4
    const [data]=await queryRows<QueryResultRow & { scheduled_occurrence_id:string|null }>(
      `UPDATE public.notification_deliveries SET status=$2,last_error=$3,attempt_count=$4,next_attempt_at=$5 WHERE id=$1 RETURNING scheduled_occurrence_id`,
      [row.id,terminal?'failed':'pending',description,row.attempt_count+1,new Date(Date.now()+60_000).toISOString()],
    )
    if(data?.scheduled_occurrence_id) await queryRows('UPDATE public.scheduled_message_occurrences SET last_sync_error=$2 WHERE id=$1',[data.scheduled_occurrence_id,description])
    total.failed=1
    total.pendingRetry=terminal?0:1
    return total
  }
  if(!snapshot) return total
  if(snapshot.busy) {
    await queryRows("UPDATE public.notification_deliveries SET status='pending',next_attempt_at=$2 WHERE id=$1",[row.id,new Date(Date.now()+10_000).toISOString()])
    return total
  }
  const o=snapshot.occurrence
  const postsMessage=row.scheduled_operation==='send' || row.scheduled_operation==='resend'
  const responses=snapshot.responses.map(r=>({name:r.name,status:r.status,arrivalTime:r.arrival_time,groupId:r.group_id}))
  let result
  try {
    if(row.scheduled_operation==='delete') result=await deleteScheduledTelegramMessage(row.chat_id,o.telegram_message_id!,o.fields.title)
    else {
      const rendered=renderScheduledMessage({id:o.id,messageType:o.message_type,body:o.body,fields:o.fields,requireArrival:o.require_arrival,attendanceGroups:o.attendance_groups,expiresAt:o.expires_at,timezone:snapshot.timezone},responses,snapshot.expired)
      result=postsMessage
        ? await sendTelegramRichMessage(row.chat_id,toRichHtml(rendered.text),{threadId:row.thread_id,replyMarkup:rendered.replyMarkup})
        : await editTelegramRichMessage(row.chat_id,o.telegram_message_id!,toRichHtml(rendered.text),rendered.replyMarkup ?? {inline_keyboard:[]})
    }
  } catch(error) {
    result={ok:false as const,errorCode:400,description:error instanceof Error?error.message:'Rendering failed',retryAfterSeconds:null}
  }
  const missingId=result.ok && postsMessage && !result.result?.message_id
  const error=result.ok ? (missingId?'Telegram accepted the send without a message ID':null) : result.description
  const ambiguous=postsMessage && (missingId || (!result.ok && result.errorCode===null && !('requestStarted' in result && result.requestStarted===false)))
  await scheduledRpc('finish_scheduled_delivery',{p_delivery:row.id,p_revision:o.revision,p_message:result.ok?result.result?.message_id??null:null,p_error:error,p_ambiguous:ambiguous})
  const failed=error!==null
  const terminal=ambiguous || row.attempt_count>=4 || (!result.ok && [400,403,404].includes(result.errorCode??0))
  await queryRows(
    `UPDATE public.notification_deliveries SET status=$2,attempt_count=$3,last_error=$4,next_attempt_at=$5,
     sent_at=CASE WHEN $6::boolean THEN now() ELSE NULL END,telegram_message_id=$7 WHERE id=$1`,
    [row.id,failed?(terminal?'failed':'pending'):'sent',row.attempt_count+1,error,new Date(Date.now()+Math.max(60,(!result.ok?result.retryAfterSeconds:0)??0)*1000).toISOString(),!failed,result.ok?result.result?.message_id??o.telegram_message_id:null],
  )
  if(failed) {total.failed=1;total.pendingRetry=terminal?0:1} else total.sent=1
  return total
}
