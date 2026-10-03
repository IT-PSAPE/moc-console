// Inline-button presses on notification messages. The presser is resolved by
// their Telegram user id inside api_apply_telegram_action; every branch
// answers the callback so Telegram stops the button's loading spinner.
import { parseActionCallback, renderActionNote, telegramStatusLabel } from "@moc/notifications"
import { publishEntityFollowUp, refreshEntityOriginals } from "./notifications/follow-ups.js"
import { applyTelegramAction } from "./telegram-actions.js"
import { answerTelegramCallbackQuery } from "./telegram.js"

type TelegramChat = { id: number | string }

export type TelegramCallbackQuery = {
  id: string
  from?: { id?: number | string }
  data?: string
  message?: { chat?: TelegramChat; message_id?: number; message_thread_id?: number; ephemeral_message_id?: number }
}

export async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
  const callbackId = callbackQuery.id
  const parsed = callbackQuery.data ? parseActionCallback(callbackQuery.data) : null
  const telegramUserId = callbackQuery.from?.id

  if (!parsed || telegramUserId === undefined) {
    await answerTelegramCallbackQuery(callbackId)
    return
  }

  const result = await applyTelegramAction({
    telegramUserId: String(telegramUserId),
    entityType: parsed.entityType,
    entityId: parsed.entityId,
    action: parsed.action,
  })

  if (result.ok) {
    const note = renderActionNote(parsed.action, result.actorName)
    await answerTelegramCallbackQuery(callbackId, { text: note })
    await publishEntityFollowUp({
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      eventKey: `telegram_action:${callbackId}`,
      note,
      loud: false,
    })
    return
  }

  switch (result.error) {
    case "not_linked":
      await answerTelegramCallbackQuery(callbackId, {
        text: "Link your Telegram account in MOC Console → Account settings first.",
        showAlert: true,
      })
      return
    case "forbidden":
      await answerTelegramCallbackQuery(callbackId, {
        text: "You don't have permission to update this.",
        showAlert: true,
      })
      return
    case "invalid_transition":
      await answerTelegramCallbackQuery(callbackId, {
        text: result.status
          ? `This has already moved on. Current status: ${telegramStatusLabel(parsed.entityType, result.status)}.`
          : "This has already moved on.",
        showAlert: true,
      })
      await refreshEntityOriginals({ entityType: parsed.entityType, entityId: parsed.entityId })
      return
    case "not_found":
      await answerTelegramCallbackQuery(callbackId, { text: "This item no longer exists." })
      return
    case "invalid_action":
      await answerTelegramCallbackQuery(callbackId, { text: "That action isn't available anymore.", showAlert: true })
      return
  }
}
