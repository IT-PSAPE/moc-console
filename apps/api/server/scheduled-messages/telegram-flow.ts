import { answerTelegramCallbackQuery, sendTelegramEphemeralMessage } from '../telegram.js'
import type { TelegramCallbackQuery } from '../telegram-callback-query.js'
import type { TelegramMessage } from '../telegram-webhook-commands.js'
import { adminCallback, adminInput, showManagementList } from './admin-flow.js'
import { attendanceCallback, attendanceInput, chooseAttendance, showAttendance } from './attendance-flow.js'
import { createSession, ownedSession, replySession, trackSessionMessage } from './sessions.js'
import type { MessageSession } from './types.js'
import { authorizeManagement, getOccurrence, getSchedule, groupWorkspace, linkedUser } from './store.js'

export async function handleScheduledCallback(query: TelegramCallbackQuery): Promise<boolean> {
  if(!query.data?.startsWith('sm:') && !query.data?.startsWith('sa:')) return false
  try {
    const telegramId=String(query.from?.id??'')
    const chatId=String(query.message?.chat?.id??'')
    if(!telegramId || !chatId) throw new Error('Message is unavailable')
    const [namespace,idOrAction,actionOrId,arg]=query.data.split(':')
    if(namespace==='sm') {
      const s=await ownedSession(idOrAction,telegramId,chatId,query.message?.ephemeral_message_id)
      if(s.kind==='admin') await adminCallback(s,actionOrId,arg,query.id)
      else await attendanceCallback(s,actionOrId,arg,query.id)
    } else {
      if(idOrAction!=='update' && idOrAction!=='yes' && idOrAction!=='no') throw new Error('Invalid attendance action')
      const actor=await linkedUser(telegramId)
      const o=await getOccurrence(actionOrId)
      const schedule=await getSchedule(o.schedule_id)
      if(schedule.group_chat_id!==chatId || o.telegram_message_id!==query.message?.message_id) throw new Error('This button is not on the original message')
      const workspace=await groupWorkspace(chatId)
      if(workspace!==o.workspace_id) throw new Error('Message unavailable')
      const s=await createSession({user_id:actor,telegram_user_id:telegramId,workspace_id:workspace,chat_id:chatId,thread_id:query.message?.message_thread_id??null,occurrence_id:o.id,kind:'attendance',data:{}})
      // Existing group cards can still carry the old update callback.
      if(idOrAction==='update') await showAttendance(s,query.id)
      else await chooseAttendance(s,idOrAction==='yes'?'attending':'not_attending',query.id)
    }
    await answerTelegramCallbackQuery(query.id)
  } catch(error) {
    await answerTelegramCallbackQuery(query.id,{text:(error instanceof Error?error.message:'The flow failed. Please restart.').slice(0,200),showAlert:true})
  }
  return true
}
export async function handleScheduledMessage(message: TelegramMessage): Promise<boolean> {
  const command=/^\/manage_messages(?:@\w+)?\s*$/.test(message.text??'')
  const promptId=message.reply_to_message?.ephemeral_message_id
  if(!command && promptId===undefined) return false
  const chatId=String(message.chat?.id??'')
  const telegramId=String(message.from?.id??'')
  if(!chatId || !telegramId || !['group','supergroup'].includes(message.chat?.type??'')) return true
  let activeSession: MessageSession | undefined
  try {
    if(command) {
      const actor=await linkedUser(telegramId)
      const workspace=await groupWorkspace(chatId)
      await authorizeManagement(actor,workspace)
      const s=await createSession({user_id:actor,telegram_user_id:telegramId,workspace_id:workspace,chat_id:chatId,thread_id:message.message_thread_id??null,occurrence_id:null,kind:'admin',data:{}})
      await showManagementList(s,0,undefined,message.ephemeral_message_id)
    } else {
      // Ordinary group replies never become private administrative input.
      if(message.ephemeral_message_id===undefined) throw new Error('Use the ephemeral reply input to keep your answer private.')
      const s=await replySession(telegramId,chatId,promptId!)
      activeSession=s
      await trackSessionMessage(s,message.ephemeral_message_id)
      const value=message.text?.trim()
      if(value===undefined || value.length>2000) throw new Error('Enter a text value of at most 2000 characters.')
      if(s.kind==='admin') await adminInput(s,value)
      else await attendanceInput(s,value)
    }
  } catch(error) {
    const errorMessage=await sendTelegramEphemeralMessage(chatId,telegramId,(error instanceof Error?error.message:'Please restart the flow.').slice(0,1000),{threadId:message.message_thread_id,replyToEphemeralId:message.ephemeral_message_id})
    if(activeSession && errorMessage.ok && errorMessage.result?.ephemeral_message_id) await trackSessionMessage(activeSession,errorMessage.result.ephemeral_message_id)
  }
  return true
}
