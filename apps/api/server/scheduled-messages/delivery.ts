import { appendAttributionFooter, readTelegramActor, readTelegramActorFromPayload, renderScheduledMessage, scheduledMessageLabel, toRichHtml, type TelegramAttribution } from '@moc/notifications'
import { queryRows, withActor } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'
import { editTelegramRichMessage, sendTelegramRichMessage } from '../telegram.js'
import type { DeliveryRunResult } from '../notifications/delivery-store.js'
import { scheduledRpc } from './store.js'
import { deleteScheduledTelegramMessage } from './delete-telegram-message.js'
import type { AttendanceResponse, Occurrence } from './types.js'

export type ScheduledDelivery = { id: string; chat_id: string; thread_id: number|null; attempt_count: number; scheduled_operation: 'send'|'resend'|'edit'|'expire'|'delete' }
type DeliverySnapshot = { busy?: boolean; occurrence: Occurrence; responses: AttendanceResponse[]; workspaceTimezone: string }
type DeliveryAttribution = QueryResultRow & { payload: unknown; original_actor: unknown; original_operation: string | null }

async function beginDelivery(row: ScheduledDelivery): Promise<{ snapshot: DeliverySnapshot | null; attribution?: DeliveryAttribution }> {
  return withActor({ userId: null, workspaceId: null, role: 'moc_worker' }, async client => {
    const snapshot = await scheduledRpc('begin_scheduled_delivery', { p_delivery: row.id }, client) as DeliverySnapshot | null
    if (!snapshot || snapshot.busy) return { snapshot }
    const occurrence = snapshot.occurrence
    // The occurrence is locked by begin_scheduled_delivery. Its revision may
    // be newer than the job we claimed, so render the actor for this revision.
    const [attribution] = await queryRows<DeliveryAttribution>(
      `SELECT current_delivery.payload,
         original.payload->'telegramActor' AS original_actor,
         original.scheduled_operation AS original_operation
       FROM public.notification_deliveries AS current_delivery
       LEFT JOIN LATERAL (
         SELECT payload, scheduled_operation FROM public.notification_deliveries
         WHERE scheduled_occurrence_id = $2 AND status = 'sent' AND telegram_message_id = $3
           AND scheduled_operation IN ('send', 'resend')
         ORDER BY sent_at DESC NULLS LAST, created_at DESC LIMIT 1
       ) AS original ON $4::boolean
       WHERE CASE WHEN $4 THEN current_delivery.event_key = $5 ELSE current_delivery.id = $1 END
       LIMIT 1`,
      [row.id, occurrence.id, occurrence.telegram_message_id, row.scheduled_operation === 'edit', `scheduled:${occurrence.id}:edit:${occurrence.revision}`],
      client,
    )
    return { snapshot, attribution }
  })
}

export async function deliverScheduledMessage(row: ScheduledDelivery): Promise<DeliveryRunResult> {
  const total: DeliveryRunResult = {attempted:1,sent:0,failed:0,pendingRetry:0}
  let snapshot:DeliverySnapshot|null
  let snapshotAttribution: DeliveryAttribution | undefined
  try {
    const started = await beginDelivery(row)
    snapshot = started.snapshot
    snapshotAttribution = started.attribution
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
  const payload = snapshotAttribution?.payload
  const actor = readTelegramActorFromPayload(payload)
  const scheduleCreator = readTelegramActor(payload && typeof payload === 'object' && 'scheduleCreator' in payload ? payload.scheduleCreator : null)
  const originalActor = readTelegramActor(snapshotAttribution?.original_actor)
  const originalAction = snapshotAttribution?.original_operation === 'resend' ? 'resent' : 'sent'
  const responses=snapshot.responses.map(r=>({name:r.name,status:r.status,arrivalTime:r.arrival_time,groupId:r.group_id,declineReason:r.decline_reason,checkedInAt:r.checked_in_at instanceof Date?r.checked_in_at.toISOString():r.checked_in_at}))
  let result
  try {
    if(row.scheduled_operation==='delete') result=await deleteScheduledTelegramMessage(row.chat_id,o.telegram_message_id!,scheduledMessageLabel(o.body),actor)
    else {
      const rendered=renderScheduledMessage({id:o.id,messageType:o.message_type,body:o.body,postRole:o.post_role,attendanceGroups:o.attendance_groups,timezone:snapshot.workspaceTimezone,legacyClosed:o.legacy_closed},responses)
      const action:TelegramAttribution['action']=row.scheduled_operation==='resend'?'resent':row.scheduled_operation==='edit'?'updated':'sent'
      let attributedHtml=toRichHtml(rendered.text)
      if(scheduleCreator.name&&(actor.source==='automation'||originalActor.source==='automation')) attributedHtml=appendAttributionFooter(attributedHtml,{...scheduleCreator,action:'created'})
      if(row.scheduled_operation==='edit'&&originalActor.source!=='unknown') attributedHtml=appendAttributionFooter(attributedHtml,{...originalActor,action:originalAction})
      attributedHtml=appendAttributionFooter(attributedHtml,{...actor,action})
      result=postsMessage
        ? await sendTelegramRichMessage(row.chat_id,attributedHtml,{threadId:row.thread_id,replyMarkup:rendered.replyMarkup})
        : await editTelegramRichMessage(row.chat_id,o.telegram_message_id!,attributedHtml,rendered.replyMarkup ?? {inline_keyboard:[]})
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
