import { appendAttributionFooter, escapeHtml, renderDeletedOriginal, toRichHtml, type TelegramActor } from '@moc/notifications'
import { deleteTelegramMessageDetailed, editTelegramRichMessage, type TelegramSendDetailed } from '../telegram.js'

function isMissing(result: TelegramSendDetailed): boolean {
  return !result.ok && result.errorCode===400 && /message.*(not found|already deleted)/i.test(result.description)
}

export async function deleteScheduledTelegramMessage(chatId: string,messageId: number,title: string,actor: TelegramActor): Promise<TelegramSendDetailed> {
  const deleted=await deleteTelegramMessageDetailed(chatId,messageId)
  if(deleted.ok || isMissing(deleted)) return {ok:true,result:null}
  // Telegram refuses deletion of old messages. Reuse the existing deleted
  // notification presentation and clear all attendance controls instead.
  if(deleted.errorCode!==400 && deleted.errorCode!==403) return deleted
  const deletedHtml=renderDeletedOriginal(toRichHtml(escapeHtml(title))).replace('<p><b>🗑️ Deleted by requester</b></p>','<p><b>🗑️ Scheduled message deleted</b></p>')
  const attributedHtml=appendAttributionFooter(deletedHtml,{...actor,action:'deleted'})
  const edited=await editTelegramRichMessage(chatId,messageId,attributedHtml,{inline_keyboard:[]})
  return isMissing(edited)?{ok:true,result:null}:edited
}
