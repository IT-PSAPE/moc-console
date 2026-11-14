import { buildNotificationKeyboard, type InlineKeyboardMarkup } from "@moc/notifications"
import { editTelegramMessageKeyboard, getTelegramBotUsername } from "../telegram.js"
import { fetchEntityStoredStatus } from "./entity-tokens.js"

export async function loadNotificationKeyboard(entityType: string, entityId: string): Promise<InlineKeyboardMarkup | null> {
  if (entityType !== "request" && entityType !== "booking" && entityType !== "venue_booking") return null
  const status = await fetchEntityStoredStatus(entityType, entityId)
  if (status === null) return null
  return buildNotificationKeyboard({ entityType, entityId, status }, { botUsername: getTelegramBotUsername() })
}

/** Recheck after an edit so a slower response cannot leave buttons from an earlier transition. */
export async function syncRequestKeyboard(
  requestId: string,
  chatId: string,
  messageId: number,
  applied?: InlineKeyboardMarkup | null,
): Promise<InlineKeyboardMarkup | null> {
  for (let pass = 0; pass < 3; pass += 1) {
    const current = await loadNotificationKeyboard("request", requestId)
    if (JSON.stringify(current) === JSON.stringify(applied)) return current
    const edited = await editTelegramMessageKeyboard(chatId, messageId, current)
    if (!edited.ok) throw new Error(edited.description)
    applied = current
  }
  return applied ?? null
}
