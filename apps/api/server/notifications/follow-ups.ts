// Follow-ups: every notification event that is not one of the five
// announcement (*.created) events. A follow-up never posts a new message on
// its own — it edits the entity's already-sent original announcement(s) in
// place (QUIET), optionally also posting a short reply to each one (LOUD),
// or deletes/marks-deleted the originals. See the shared Telegram contract's
// "Messaging model" section for the product rules this implements.
//
// IO is injected (see FollowUpIO) so the publish/delete/refresh flows —
// quiet vs loud, the delete fallback, idempotent reply keys — are directly
// unit-testable against a fake original instead of a live Supabase + Telegram
// round trip. See follow-ups.test.ts.

import {
  appendUpdateFooter,
  buildNotificationKeyboard,
  formatDateTokens,
  renderDeletedOriginal,
  renderTemplate,
  toRichHtml,
  type InlineKeyboardMarkup,
  type NotificationEntityType,
  type TokenValues,
} from "@moc/notifications"
import { getSupabaseAdmin } from "../supabase-admin.js"
import { deleteTelegramMessage, editTelegramRichMessage, getTelegramBotUsername, type TelegramSendDetailed } from "../telegram.js"
import { resolveTemplate } from "./templates.js"
import { fetchFormatSettings, type FormatSettings } from "./format-settings.js"
import { buildFreshEntityTokens, fetchEntityStoredStatus } from "./entity-tokens.js"
import { enqueueDelivery, processDeliveriesForEvent } from "./delivery-store.js"

export type NotificationEntityRef = { entityType: NotificationEntityType; entityId: string }

export type OriginalRow = {
  id: string
  workspace_id: string
  event_type: string
  scope: "group" | "dm"
  route_id: string | null
  recipient_user_id: string | null
  chat_id: string
  thread_id: number | null
  text: string
  telegram_message_id: number
}

export type FollowUpIO = {
  fetchOriginals: (entityType: NotificationEntityType, entityId: string) => Promise<OriginalRow[]>
  resolveTemplate: typeof resolveTemplate
  fetchFormatSettings: (workspaceId: string) => Promise<FormatSettings>
  buildFreshEntityTokens: (workspaceId: string, entityType: NotificationEntityType, entityId: string) => Promise<TokenValues>
  buildKeyboard: (entityType: NotificationEntityType, entityId: string) => Promise<InlineKeyboardMarkup | null>
  editOriginal: (chatId: string, messageId: number, html: string, keyboard: InlineKeyboardMarkup | null) => Promise<TelegramSendDetailed>
  deleteOriginal: (chatId: string, messageId: number) => Promise<{ ok: boolean; description?: string }>
  enqueueDelivery: typeof enqueueDelivery
  processDeliveriesForEvent: typeof processDeliveriesForEvent
  persistKeyboard: (deliveryId: string, keyboard: InlineKeyboardMarkup | null) => Promise<void>
  markDeleted: (deliveryId: string) => Promise<void>
}

// Only these entity types carry inline action buttons — see
// buildNotificationKeyboard's KeyboardTarget union.
const KEYBOARD_ENTITY_TYPES = new Set<NotificationEntityType>(["request", "booking", "venue_booking"])

function logFollowUpFailure(action: string, ref: NotificationEntityRef, error: unknown): void {
  console.error(`Telegram follow-up failed (${action})`, {
    source: "notifications.follow-ups",
    entityType: ref.entityType,
    entityId: ref.entityId,
    error: error instanceof Error ? error.message : String(error),
  })
}

// An "original" is a sent, not-yet-deleted, not-itself-a-reply delivery for
// this entity. Its event_type is always the entity's own announcement key
// (there is exactly one *.created event per entity type), so no further
// filtering by isAnnouncementEvent is needed once entity_type/entity_id and
// parent_delivery_id are pinned down.
async function fetchOriginals(entityType: NotificationEntityType, entityId: string): Promise<OriginalRow[]> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("notification_deliveries")
    .select(
      "id, workspace_id, event_type, scope, route_id, recipient_user_id, chat_id, thread_id, text, telegram_message_id",
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "sent")
    .is("telegram_deleted_at", null)
    .is("parent_delivery_id", null)
    .not("telegram_message_id", "is", null)
  if (error) throw new Error(error.message)
  return (data ?? []) as OriginalRow[]
}

async function buildKeyboard(entityType: NotificationEntityType, entityId: string): Promise<InlineKeyboardMarkup | null> {
  if (!KEYBOARD_ENTITY_TYPES.has(entityType)) return null
  const status = await fetchEntityStoredStatus(entityType, entityId)
  if (status === null) return null
  return buildNotificationKeyboard(
    { entityType: entityType as "request" | "booking" | "venue_booking", entityId, status },
    { botUsername: getTelegramBotUsername() },
  )
}

async function persistKeyboard(deliveryId: string, keyboard: InlineKeyboardMarkup | null): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("notification_deliveries").update({ reply_markup: keyboard }).eq("id", deliveryId)
  if (error) throw new Error(error.message)
}

async function markDeleted(deliveryId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("notification_deliveries")
    .update({ telegram_deleted_at: new Date().toISOString() })
    .eq("id", deliveryId)
  if (error) throw new Error(error.message)
}

export const defaultFollowUpIO: FollowUpIO = {
  fetchOriginals,
  resolveTemplate,
  fetchFormatSettings,
  buildFreshEntityTokens,
  buildKeyboard,
  editOriginal: (chatId, messageId, html, keyboard) => editTelegramRichMessage(chatId, messageId, html, keyboard),
  deleteOriginal: (chatId, messageId) => deleteTelegramMessage(chatId, messageId),
  enqueueDelivery,
  processDeliveriesForEvent,
  persistKeyboard,
  markDeleted,
}

// Re-renders one original from the entity's live data (never from the
// delivery's stored, possibly stale, text), appends the change-note footer
// (skipped when `note` is null — refreshEntityOriginals's case), builds a
// fresh keyboard, and edits the sent message in place.
async function refreshOriginal(
  io: FollowUpIO,
  original: OriginalRow,
  ref: NotificationEntityRef,
  note: string | null,
  now: Date,
): Promise<void> {
  const [template, format, tokens, keyboard] = await Promise.all([
    io.resolveTemplate(original.workspace_id, original.scope, original.event_type as Parameters<typeof resolveTemplate>[2]),
    io.fetchFormatSettings(original.workspace_id),
    io.buildFreshEntityTokens(original.workspace_id, ref.entityType, ref.entityId),
    io.buildKeyboard(ref.entityType, ref.entityId),
  ])
  const rendered = renderTemplate(template, formatDateTokens(tokens, format.timezone, format.dateFormat))
  const html = note !== null ? appendUpdateFooter(toRichHtml(rendered), note, now) : toRichHtml(rendered)
  const edited = await io.editOriginal(original.chat_id, original.telegram_message_id, html, keyboard)
  if (!edited.ok) {
    console.error("Telegram original edit failed", {
      source: "notifications.follow-ups",
      deliveryId: original.id,
      entityType: ref.entityType,
      entityId: ref.entityId,
      errorCode: edited.errorCode,
      description: edited.description,
    })
  }
  await io.persistKeyboard(original.id, keyboard)
}

// A loud follow-up's reply reuses the original's own (scope, chatId,
// threadId) as its destination, so enqueueDelivery's (event_key,
// destination_key) upsert makes retrying the same eventKey idempotent — the
// second attempt lands on the same row and is ignored.
async function enqueueLoudReply(io: FollowUpIO, original: OriginalRow, eventKey: string, note: string): Promise<void> {
  await io.enqueueDelivery({
    workspaceId: original.workspace_id,
    eventKey,
    eventType: null,
    scope: original.scope,
    routeId: original.route_id,
    recipientUserId: original.recipient_user_id,
    chatId: original.chat_id,
    threadId: original.thread_id,
    text: note,
    payload: { parentDeliveryId: original.id },
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
  input: NotificationEntityRef & { eventKey: string; note: string; loud: boolean },
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
    const now = new Date()
    for (const original of originals) {
      await refreshOriginal(io, original, input, input.note, now)
      if (input.loud) await enqueueLoudReply(io, original, input.eventKey, input.note)
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
  input: NotificationEntityRef & { eventKey: string },
  io: FollowUpIO = defaultFollowUpIO,
): Promise<void> {
  try {
    const originals = await io.fetchOriginals(input.entityType, input.entityId)
    for (const original of originals) {
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
          renderDeletedOriginal(toRichHtml(original.text)),
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
 * a reply or adding a footer note — used to correct a stale keyboard (e.g.
 * after an inline-action attempt found the transition no longer valid).
 */
export async function refreshEntityOriginals(
  input: NotificationEntityRef,
  io: FollowUpIO = defaultFollowUpIO,
): Promise<void> {
  try {
    const originals = await io.fetchOriginals(input.entityType, input.entityId)
    for (const original of originals) {
      await refreshOriginal(io, original, input, null, new Date())
    }
  } catch (error) {
    logFollowUpFailure("refresh", input, error)
  }
}
