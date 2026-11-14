// Follow-ups: every notification event that is not one of the five
// announcement (*.created) events. A follow-up never posts a new message on
// its own — it edits the entity's already-sent original announcement(s) in
// place (QUIET), optionally also posting a short reply to each one (LOUD),
// or deletes/marks-deleted the originals. See the shared Telegram contract's
// "Messaging model" section for the product rules this implements.
//
// IO is injected (see FollowUpIO) so the publish/delete/refresh flows —
// quiet vs loud, the delete fallback, idempotent reply keys — are directly
// unit-testable against a fake original instead of a live PostgreSQL + Telegram
// round trip. See follow-ups.test.ts.

import {
  appendAttributionFooter,
  appendUpdateFooter,
  formatDateTokens,
  readTelegramActorFromPayload,
  renderDeletedOriginal,
  renderTelegramAttribution,
  renderTemplate,
  toRichHtml,
  type InlineKeyboardMarkup,
  type NotificationEntityType,
  type TelegramAttribution,
  type TokenValues,
} from "@moc/notifications"
import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"
import { deleteTelegramMessage, editTelegramRichMessage, type TelegramSendDetailed } from "../telegram.js"
import { resolveTemplate } from "./templates.js"
import { fetchFormatSettings, type FormatSettings } from "./format-settings.js"
import { buildFreshEntityTokens } from "./entity-tokens.js"
import { enqueueDelivery, processDeliveriesForEvent } from "./delivery-store.js"
import { loadNotificationKeyboard, syncRequestKeyboard } from "./notification-keyboard.js"

export type NotificationEntityRef = { entityType: NotificationEntityType; entityId: string }

export type OriginalRow = QueryResultRow & {
  id: string
  workspace_id: string
  event_type: string | null
  scope: "group" | "dm"
  route_id: string | null
  recipient_user_id: string | null
  chat_id: string
  thread_id: number | null
  text: string
  payload?: unknown
  telegram_message_id: number
}

type ChangeNote = { note: string; at: string }

export type FollowUpIO = {
  fetchOriginals: (entityType: NotificationEntityType, entityId: string) => Promise<OriginalRow[]>
  resolveTemplate: typeof resolveTemplate
  fetchFormatSettings: (workspaceId: string) => Promise<FormatSettings>
  buildFreshEntityTokens: (workspaceId: string, entityType: NotificationEntityType, entityId: string) => Promise<TokenValues>
  buildKeyboard: (entityType: NotificationEntityType, entityId: string) => Promise<InlineKeyboardMarkup | null>
  syncRequestKeyboard: typeof syncRequestKeyboard
  editOriginal: (chatId: string, messageId: number, html: string, keyboard: InlineKeyboardMarkup | null) => Promise<TelegramSendDetailed>
  deleteOriginal: (chatId: string, messageId: number) => Promise<{ ok: boolean; description?: string }>
  enqueueDelivery: typeof enqueueDelivery
  processDeliveriesForEvent: typeof processDeliveriesForEvent
  persistKeyboard: (deliveryId: string, keyboard: InlineKeyboardMarkup | null, change?: ChangeNote) => Promise<void>
  markDeleted: (deliveryId: string) => Promise<void>
}

function logFollowUpFailure(action: string, ref: NotificationEntityRef, error: unknown): void {
  console.error(`Telegram follow-up failed (${action})`, {
    source: "notifications.follow-ups",
    entityType: ref.entityType,
    entityId: ref.entityId,
    error: error instanceof Error ? error.message : String(error),
  })
}

// Request assignment DMs sent before entity linkage was added still have the
// request ID in their delivery payload. Match those alongside linked messages.
async function fetchOriginals(entityType: NotificationEntityType, entityId: string): Promise<OriginalRow[]> {
  return queryRows<OriginalRow>(
    `SELECT id, workspace_id, event_type, scope, route_id, recipient_user_id,
       chat_id, thread_id, text, payload, telegram_message_id::double precision AS telegram_message_id
     FROM public.notification_deliveries
     WHERE status = 'sent' AND telegram_deleted_at IS NULL AND parent_delivery_id IS NULL
       AND telegram_message_id IS NOT NULL AND (
         (entity_type = $1 AND entity_id = $2::uuid)
         OR ($1 = 'request' AND entity_id IS NULL AND scope = 'dm' AND event_type IS NULL
           AND event_key LIKE 'assignment.request:%' AND payload->>'parentId' = $2::text)
       )`,
    [entityType, entityId],
  )
}

async function persistKeyboard(deliveryId: string, keyboard: InlineKeyboardMarkup | null, change?: ChangeNote): Promise<void> {
  await queryRows(
    `UPDATE public.notification_deliveries SET reply_markup = $2::jsonb,
       payload = CASE WHEN $3::jsonb IS NULL THEN payload ELSE coalesce(payload, '{}'::jsonb) || jsonb_build_object('telegramChange', $3::jsonb) END
     WHERE id = $1`,
    [deliveryId, keyboard === null ? null : JSON.stringify(keyboard), change ? JSON.stringify(change) : null],
  )
}

async function markDeleted(deliveryId: string): Promise<void> {
  await queryRows("UPDATE public.notification_deliveries SET telegram_deleted_at = now() WHERE id = $1", [deliveryId])
}

export const defaultFollowUpIO: FollowUpIO = {
  fetchOriginals,
  resolveTemplate,
  fetchFormatSettings,
  buildFreshEntityTokens,
  buildKeyboard: loadNotificationKeyboard,
  syncRequestKeyboard,
  editOriginal: (chatId, messageId, html, keyboard) => editTelegramRichMessage(chatId, messageId, html, keyboard),
  deleteOriginal: (chatId, messageId) => deleteTelegramMessage(chatId, messageId),
  enqueueDelivery,
  processDeliveriesForEvent,
  persistKeyboard,
  markDeleted,
}

// Re-renders one original from the entity's live data (never from the
// delivery's stored, possibly stale, text), retaining creation attribution and
// the last visible change when a keyboard-only refresh is needed.
function storedChange(payload: unknown): ChangeNote | undefined {
  if (!payload || typeof payload !== "object" || !("telegramChange" in payload)) return undefined
  const change = payload.telegramChange
  if (!change || typeof change !== "object" || !("note" in change) || !("at" in change)) return undefined
  if (typeof change.note !== "string" || typeof change.at !== "string" || !Number.isFinite(Date.parse(change.at))) return undefined
  return { note: change.note, at: change.at }
}

async function refreshOriginal(
  io: FollowUpIO,
  original: OriginalRow,
  ref: NotificationEntityRef,
  change?: ChangeNote,
): Promise<void> {
  if (original.event_type === null) {
    const keyboard = await io.syncRequestKeyboard(ref.entityId, original.chat_id, original.telegram_message_id)
    await io.persistKeyboard(original.id, keyboard)
    return
  }
  const [template, format, tokens, keyboard] = await Promise.all([
    io.resolveTemplate(original.workspace_id, "group", original.event_type as Parameters<typeof resolveTemplate>[2]),
    io.fetchFormatSettings(original.workspace_id),
    io.buildFreshEntityTokens(original.workspace_id, ref.entityType, ref.entityId),
    io.buildKeyboard(ref.entityType, ref.entityId),
  ])
  const rendered = renderTemplate(template, formatDateTokens(tokens, format.timezone, format.dateFormat))
  const created = appendAttributionFooter(toRichHtml(rendered), { ...readTelegramActorFromPayload(original.payload), action: "created" })
  const latest = change ?? storedChange(original.payload)
  const html = latest ? appendUpdateFooter(created, latest.note, new Date(latest.at)) : created
  const edited = await io.editOriginal(original.chat_id, original.telegram_message_id, html, keyboard)
  if (!edited.ok) throw new Error(edited.description)
  const applied = ref.entityType === "request"
    ? await io.syncRequestKeyboard(ref.entityId, original.chat_id, original.telegram_message_id, keyboard)
    : keyboard
  await io.persistKeyboard(original.id, applied, change)
}

// A loud follow-up's reply reuses the original's own (scope, chatId,
// threadId) as its destination, so enqueueDelivery's (event_key,
// destination_key) upsert makes retrying the same eventKey idempotent — the
// second attempt lands on the same row and is ignored.
async function enqueueLoudReply(io: FollowUpIO, original: OriginalRow, eventKey: string, note: string, attribution?: TelegramAttribution): Promise<void> {
  await io.enqueueDelivery({
    workspaceId: original.workspace_id,
    eventKey,
    eventType: null,
    scope: original.scope,
    routeId: original.route_id,
    recipientUserId: original.recipient_user_id,
    chatId: original.chat_id,
    threadId: original.thread_id,
    text: attribution ? appendAttributionFooter(note, attribution) : note,
    payload: { parentDeliveryId: original.id, ...(attribution ? { telegramActor: attribution } : {}) },
    parentDeliveryId: original.id,
  })
  await io.processDeliveriesForEvent(eventKey)
}

/**
 * Edits every sent original for the entity with a fresh render + the
 * change-note footer, and — when loud — also enqueues a short reply to each
 * one. Idempotent per eventKey (the reply enqueue is; the edit itself is
 * naturally idempotent, it just re-applies the same current state). Never
 * throws: any failure is logged and swallowed, same as every other
 * best-effort notification path in this app.
 */
export async function publishEntityFollowUp(
  input: NotificationEntityRef & { eventKey: string; note: string; loud: boolean; attribution?: TelegramAttribution },
  io: FollowUpIO = defaultFollowUpIO,
): Promise<void> {
  try {
    const originals = await io.fetchOriginals(input.entityType, input.entityId)
    if (originals.length === 0) {
      console.log(`No sent Telegram original to follow up for ${input.entityType}:${input.entityId} (${input.eventKey})`, {
        source: "notifications.follow-ups",
      })
      return
    }
    const change = {
      note: input.attribution ? `${input.note}<br>${renderTelegramAttribution(input.attribution)}` : input.note,
      at: new Date().toISOString(),
    }
    for (const original of originals) {
      try {
        await refreshOriginal(io, original, input, change)
      } catch (error) {
        logFollowUpFailure(`edit delivery ${original.id}`, input, error)
      }
      if (!input.loud || original.event_type === null) continue
      try {
        await enqueueLoudReply(io, original, input.eventKey, input.note, input.attribution)
      } catch (error) {
        logFollowUpFailure(`reply to delivery ${original.id}`, input, error)
      }
    }
  } catch (error) {
    logFollowUpFailure("publish", input, error)
  }
}

/**
 * Deletes every sent original for the entity. Bots can only delete their own
 * messages under 48h old — when Telegram refuses, the original is instead
 * edited into a struck-through "deleted" state with no keyboard. Either way
 * telegram_deleted_at is stamped so the row stops being a follow-up target.
 */
export async function deleteEntityOriginals(
  input: NotificationEntityRef & { eventKey: string; attribution?: TelegramAttribution },
  io: FollowUpIO = defaultFollowUpIO,
): Promise<void> {
  try {
    const originals = await io.fetchOriginals(input.entityType, input.entityId)
    for (const original of originals) {
      if (original.event_type === null) {
        try {
          await refreshOriginal(io, original, input)
        } catch (error) {
          logFollowUpFailure(`clear delivery ${original.id}`, input, error)
        }
        continue
      }
      const deleted = await io.deleteOriginal(original.chat_id, original.telegram_message_id)
      if (!deleted.ok) {
        console.error("Telegram original delete failed; falling back to a struck-through edit", {
          source: "notifications.follow-ups",
          deliveryId: original.id,
          description: deleted.description,
        })
        const edited = await io.editOriginal(
          original.chat_id,
          original.telegram_message_id,
          appendAttributionFooter(renderDeletedOriginal(toRichHtml(original.text)), input.attribution ?? { source: "requester", action: "deleted" }),
          null,
        )
        if (!edited.ok) {
          console.error("Telegram deleted-original fallback edit also failed", {
            source: "notifications.follow-ups",
            deliveryId: original.id,
            errorCode: edited.errorCode,
            description: edited.description,
          })
        }
      }
      await io.markDeleted(original.id)
    }
  } catch (error) {
    logFollowUpFailure("delete", input, error)
  }
}

/**
 * Re-renders and re-keys every sent original for the entity without posting
 * a reply or replacing the attribution — used to correct a stale keyboard (e.g.
 * after an inline-action attempt found the transition no longer valid).
 */
export async function refreshEntityOriginals(
  input: NotificationEntityRef,
  io: FollowUpIO = defaultFollowUpIO,
): Promise<void> {
  try {
    const originals = await io.fetchOriginals(input.entityType, input.entityId)
    for (const original of originals) {
      try {
        await refreshOriginal(io, original, input)
      } catch (error) {
        logFollowUpFailure(`refresh delivery ${original.id}`, input, error)
      }
    }
  } catch (error) {
    logFollowUpFailure("refresh", input, error)
  }
}
