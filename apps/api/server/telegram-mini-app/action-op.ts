// The "action" op: apply an inline-button-equivalent transition from inside
// the Mini App, post the same quiet follow-up an inline button press would,
// then return the refreshed view.

import { randomUUID } from "node:crypto"

import { renderActionNote, type MiniAppResponse, type TelegramAction, type TelegramActionEntityType } from "@moc/notifications"
import { publishEntityFollowUp } from "../notifications/follow-ups.js"
import { applyTelegramAction } from "../telegram-actions.js"
import { loadEntityDetailResponse } from "./view-op.js"

export async function handleAction(
  telegramUserId: string,
  entityType: TelegramActionEntityType,
  entityId: string,
  action: TelegramAction,
): Promise<MiniAppResponse> {
  const result = await applyTelegramAction({ telegramUserId, entityType, entityId, action })

  if (!result.ok) {
    if (result.error === "not_linked") return { ok: false, error: "not_linked", message: "Link your Telegram account in MOC Console first." }
    if (result.error === "forbidden") return { ok: false, error: "forbidden", message: "You don't have permission to do that." }
    if (result.error === "not_found") return { ok: false, error: "not_found", message: "That item could not be found." }
    if (result.error === "invalid_transition") return { ok: false, error: "invalid_transition", message: "That action no longer applies — someone else may have already updated this." }
    return { ok: false, error: "invalid", message: "That action isn't available." }
  }

  await publishEntityFollowUp({
    entityType,
    entityId,
    eventKey: `mini_app_action:${randomUUID()}`,
    note: renderActionNote(action, result.actorName),
    loud: false,
  })

  return loadEntityDetailResponse(entityType, entityId, telegramUserId)
}
