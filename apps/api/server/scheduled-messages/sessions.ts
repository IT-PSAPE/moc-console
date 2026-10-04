import type { InlineKeyboardButton, InlineKeyboardMarkup } from '@moc/notifications'
import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'
import { deleteTelegramEphemeralMessage, editTelegramEphemeralMessage, sendTelegramEphemeralMessage } from '../telegram.js'
import { authorizeManagement, linkedUser } from './store.js'
import type { MessageSession, SessionData } from './types.js'

type DatabaseSession = QueryResultRow & Omit<MessageSession,'ephemeral_message_id'> & {ephemeral_message_id:number|string|null}

function mapSession(row:DatabaseSession):MessageSession {
  const messageId=row.ephemeral_message_id===null?null:Number(row.ephemeral_message_id)
  if(messageId!==null&&!Number.isSafeInteger(messageId)) throw new Error('Scheduled message session contains an invalid Telegram message ID')
  return {...row,ephemeral_message_id:messageId}
}

export async function createSession(input: Omit<MessageSession,'id'|'expires_at'|'ephemeral_message_id'>): Promise<MessageSession> {
  // One atomic upsert rotates the session ID, invalidating old controls even
  // when two flow starts race in the same chat.
  const [previousRow]=await queryRows<DatabaseSession>("SELECT * FROM public.scheduled_message_sessions WHERE telegram_user_id=$1 AND chat_id=$2",[input.telegram_user_id,input.chat_id])
  const previous=previousRow?mapSession(previousRow):undefined
  if(previous) await clearSession(previous)
  const retained=previous?.data.transientMessageIds??[]
  const [row]=await queryRows<DatabaseSession>(
    `INSERT INTO public.scheduled_message_sessions (id,user_id,telegram_user_id,workspace_id,chat_id,thread_id,ephemeral_message_id,occurrence_id,kind,data,expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,$8,$9::jsonb,now()+interval '15 minutes')
     ON CONFLICT (telegram_user_id,chat_id) DO UPDATE SET id=EXCLUDED.id,user_id=EXCLUDED.user_id,workspace_id=EXCLUDED.workspace_id,thread_id=EXCLUDED.thread_id,ephemeral_message_id=NULL,occurrence_id=EXCLUDED.occurrence_id,kind=EXCLUDED.kind,data=EXCLUDED.data,expires_at=EXCLUDED.expires_at
     RETURNING *`,[crypto.randomUUID(),input.user_id,input.telegram_user_id,input.workspace_id,input.chat_id,input.thread_id,input.occurrence_id,input.kind,JSON.stringify({...input.data,transientMessageIds:retained})])
  if(!row) throw new Error('Could not create scheduled message session')
  return mapSession(row)
}
export async function ownedSession(id: string,telegramId: string,chatId: string,ephemeralId: number|undefined): Promise<MessageSession> {
  const [row]=await queryRows<DatabaseSession>("SELECT * FROM public.scheduled_message_sessions WHERE id=$1 AND telegram_user_id=$2 AND chat_id=$3 AND expires_at>now()",[id,telegramId,chatId])
  if(!row) throw new Error('This flow has ended. Restart it from the group message or /manage_messages.')
  const s=mapSession(row)
  if(s.ephemeral_message_id===null || s.ephemeral_message_id!==ephemeralId) throw new Error('This control belongs to another interaction.')
  if(await linkedUser(telegramId)!==s.user_id) throw new Error('Your Telegram link has changed. Restart the flow.')
  if(s.kind==='admin') await authorizeManagement(s.user_id,s.workspace_id)
  return s
}
export async function saveSession(s: MessageSession,changes: Partial<Pick<MessageSession,'data'|'occurrence_id'|'ephemeral_message_id'>>): Promise<void> {
  await queryRows(
    `UPDATE public.scheduled_message_sessions SET data=coalesce($2::jsonb,data),
     occurrence_id=CASE WHEN $3::boolean THEN $4::uuid ELSE occurrence_id END,
     ephemeral_message_id=CASE WHEN $5::boolean THEN $6::bigint ELSE ephemeral_message_id END WHERE id=$1`,
    [s.id,changes.data===undefined?null:JSON.stringify(changes.data),changes.occurrence_id!==undefined,changes.occurrence_id??null,changes.ephemeral_message_id!==undefined,changes.ephemeral_message_id??null],
  )
  Object.assign(s,changes)
}
export function sessionButton(s: MessageSession,text: string,action: string): InlineKeyboardButton {
  return {text,callback_data:`sm:${s.id}:${action}`}
}
export async function showSession(s: MessageSession,text: string,rows: InlineKeyboardButton[][],callbackId?: string,replyId?: number): Promise<void> {
  const markup: InlineKeyboardMarkup={inline_keyboard:rows}
  const sent=s.ephemeral_message_id===null
    ? await sendTelegramEphemeralMessage(s.chat_id,s.telegram_user_id,text,{callbackQueryId:callbackId,replyToEphemeralId:replyId,threadId:s.thread_id,replyMarkup:markup})
    : await editTelegramEphemeralMessage(s.chat_id,s.telegram_user_id,s.ephemeral_message_id,text,markup)
  if(!sent.ok) throw new Error('Telegram could not display this ephemeral flow. Please restart it.')
  if(s.ephemeral_message_id===null) {
    if(!sent.result?.ephemeral_message_id) throw new Error('Telegram did not return an ephemeral message ID.')
    await saveSession(s,{ephemeral_message_id:sent.result.ephemeral_message_id})
  }
}
export async function promptSession(s: MessageSession,current: string,field: string,callbackId?: string): Promise<void> {
  const hint=['sendOn','expiresAt'].includes(field)?'\nUse a date and time with a timezone offset, e.g. 2026-10-04T18:30+02:00.':''
  const sent=await sendTelegramEphemeralMessage(s.chat_id,s.telegram_user_id,`Current value: ${current || '(empty)'}\nReply with the replacement ${field}.${hint}`,{threadId:s.thread_id,callbackQueryId:callbackId,forceReply:true})
  if(!sent.ok || !sent.result?.ephemeral_message_id) throw new Error('Telegram could not open the input. Restart the flow.')
  await saveSession(s,{data:{...s.data,transientMessageIds:[...(s.data.transientMessageIds??[]),sent.result.ephemeral_message_id],stage:'input',promptId:sent.result.ephemeral_message_id}})
}
export async function replySession(telegramId: string,chatId: string,promptId: number): Promise<MessageSession> {
  const [row]=await queryRows<DatabaseSession>("SELECT * FROM public.scheduled_message_sessions WHERE telegram_user_id=$1 AND chat_id=$2 AND expires_at>now() AND data @> $3::jsonb",[telegramId,chatId,JSON.stringify({promptId,stage:'input'})])
  if(!row) throw new Error('This input has expired. Restart the flow.')
  const s=mapSession(row)
  return ownedSession(s.id,telegramId,chatId,s.ephemeral_message_id??undefined)
}
export async function finishSession(s: MessageSession,text: string,rows: InlineKeyboardButton[][]=[]): Promise<void> {
  await showSession(s,text,rows)
  await queryRows('DELETE FROM public.scheduled_message_sessions WHERE id=$1',[s.id])
}
export async function setDraft(s: MessageSession,data: SessionData): Promise<void> {
  await saveSession(s,{data:{...data,transientMessageIds:s.data.transientMessageIds}})
}

/** Track replies and validation prompts as well as the reusable control message. */
export async function trackSessionMessage(s: MessageSession,id: number): Promise<void> {
  await saveSession(s,{data:{...s.data,transientMessageIds:[...new Set([...(s.data.transientMessageIds??[]),id])]}})
}

/** Close controls even if Telegram cannot deliver every deletion event. */
export async function clearSession(s: MessageSession): Promise<void> {
  const ids=[...new Set([s.ephemeral_message_id,s.data.promptId,...(s.data.transientMessageIds??[])].filter((id): id is number=>typeof id==='number'))]
  const results=await Promise.all(ids.map(id=>deleteTelegramEphemeralMessage(s.chat_id,s.telegram_user_id,id)))
  const remaining=ids.filter((_,index)=>{
    const result=results[index]
    return !result.ok && !(result.errorCode===400 && /message.*(not found|already deleted)/i.test(result.description))
  })
  if(remaining.length) {
    // Preserve failed IDs for another cleanup attempt when the user restarts.
    await saveSession(s,{ephemeral_message_id:null,data:{transientMessageIds:remaining}})
    return
  }
  await queryRows('DELETE FROM public.scheduled_message_sessions WHERE id=$1',[s.id])
  Object.assign(s,{ephemeral_message_id:null,data:{}})
}
