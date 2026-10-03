import type { InlineKeyboardButton, InlineKeyboardMarkup } from '@moc/notifications'
import { getSupabaseAdmin } from '../supabase-admin.js'
import { editTelegramEphemeralMessage, sendTelegramEphemeralMessage } from '../telegram.js'
import { authorizeManagement, linkedUser } from './store.js'
import type { MessageSession, SessionData } from './types.js'

export async function createSession(input: Omit<MessageSession,'id'|'expires_at'|'ephemeral_message_id'>): Promise<MessageSession> {
  // One atomic upsert rotates the session ID, invalidating old controls even
  // when two flow starts race in the same chat.
  const admin=getSupabaseAdmin()
  const {data,error}=await admin.from('scheduled_message_sessions').upsert({...input,id:crypto.randomUUID(),ephemeral_message_id:null,expires_at:new Date(Date.now()+15*60_000).toISOString()},{onConflict:'telegram_user_id,chat_id'}).select('*').single()
  if(error) throw new Error(error.message)
  return data as MessageSession
}
export async function ownedSession(id: string,telegramId: string,chatId: string,ephemeralId: number|undefined): Promise<MessageSession> {
  const {data,error}=await getSupabaseAdmin().from('scheduled_message_sessions').select('*').eq('id',id).eq('telegram_user_id',telegramId).eq('chat_id',chatId).gt('expires_at',new Date().toISOString()).single()
  if(error || !data) throw new Error('This flow has ended. Restart it from the group message or /manage_messages.')
  const s=data as MessageSession
  if(s.ephemeral_message_id!==ephemeralId) throw new Error('This control belongs to another interaction.')
  if(await linkedUser(telegramId)!==s.user_id) throw new Error('Your Telegram link has changed. Restart the flow.')
  if(s.kind==='admin') await authorizeManagement(s.user_id,s.workspace_id)
  return s
}
export async function saveSession(s: MessageSession,changes: Partial<Pick<MessageSession,'data'|'occurrence_id'|'ephemeral_message_id'>>): Promise<void> {
  const {error}=await getSupabaseAdmin().from('scheduled_message_sessions').update(changes).eq('id',s.id)
  if(error) throw new Error(error.message)
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
  const sent=await sendTelegramEphemeralMessage(s.chat_id,s.telegram_user_id,`Current value: ${current || '(empty)'}\nReply with the replacement ${field}.`,{threadId:s.thread_id,callbackQueryId:callbackId,forceReply:true})
  if(!sent.ok || !sent.result?.ephemeral_message_id) throw new Error('Telegram could not open the input. Restart the flow.')
  await saveSession(s,{data:{...s.data,stage:'input',promptId:sent.result.ephemeral_message_id}})
}
export async function replySession(telegramId: string,chatId: string,promptId: number): Promise<MessageSession> {
  const {data,error}=await getSupabaseAdmin().from('scheduled_message_sessions').select('*').eq('telegram_user_id',telegramId).eq('chat_id',chatId).gt('expires_at',new Date().toISOString()).contains('data',{promptId,stage:'input'}).single()
  if(error || !data) throw new Error('This input has expired. Restart the flow.')
  const s=data as MessageSession
  return ownedSession(s.id,telegramId,chatId,s.ephemeral_message_id??undefined)
}
export async function finishSession(s: MessageSession,text: string,rows: InlineKeyboardButton[][]=[]): Promise<void> {
  await showSession(s,text,rows)
  const {error}=await getSupabaseAdmin().from('scheduled_message_sessions').delete().eq('id',s.id)
  if(error) throw new Error(error.message)
}
export async function setDraft(s: MessageSession,data: SessionData): Promise<void> {
  await saveSession(s,{data})
}
