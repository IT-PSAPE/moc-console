import { getSupabaseAdmin } from "../../supabase-admin.js"
import { requireAuthorizedCronGet } from "../../cron-auth.js"
import { resolveBaseUrl } from "../../base-url.js"
import { escapeHtml, isLoudFollowUp, renderFollowUpNote, type FollowUpEventKey } from "@moc/notifications"
import type { RequestStalePayload, BookingStalePayload } from "../../notifications/dispatch.js"
import { buildTokens, toNoteTokens } from "../../notifications/dispatch-tokens.js"
import { publishEntityFollowUp } from "../../notifications/follow-ups.js"
import { enqueueDelivery, processDeliveriesForEvent, type DeliveryRunResult } from "../../notifications/delivery-store.js"

// Daily stale-item sweep — wired to a Vercel Cron (00:00 UTC, see
// vercel.json). Finds requests/bookings that have gone past their
// workspace stale threshold without being attended to and alerts the
// configured recipients over Telegram:
//   • group: a loud follow-up reply on the item's own original announcement
//     message(s) (never a new group post — see follow-ups.ts)
//   • DM:    every enabled notification_recipients user with a linked
//            telegram_chat_id, in that item's workspace
//
// Detection + claim happens in SQL. A claim has a durable event key but does
// not stamp stale_notified_at until all delivery rows are persisted. If this
// function stops midway through a run, the claim expires and the same key is
// used again, so queue inserts stay idempotent.

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type StaleRequestRow = {
  id: string
  workspace_id: string
  title: string
  status: string
  updated_at: string
  stale_notification_event_key: string | null
  // Computed in SQL from the pre-claim updated_at; null until the
  // 20260814120000 migration is applied (then daysSince is the fallback).
  stale_days: number | null
}

type StaleBookingRow = {
  id: string
  workspace_id: string
  title: string
  status: string
  tracking_code: string
  updated_at: string
  expected_return_at: string | null
  returned_at: string | null
  stale_notification_event_key: string | null
  is_overdue: boolean | null
  stale_days: number | null
}

type RecipientRow = {
  workspace_id: string
  user_id: string
  users: { telegram_chat_id: string | null } | { telegram_chat_id: string | null }[] | null
}

const MS_PER_DAY = 86_400_000

// Fallback only — the claim RPCs compute the day count in SQL from the
// pre-claim timestamps. Overdue counts started days so a deadline that passed
// hours ago reads as 1, matching the SQL branch.
function daysSince(iso: string | null, mode: "elapsed" | "started" = "elapsed"): number {
  if (!iso) return 0
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 0
  const days = (Date.now() - then) / MS_PER_DAY
  return mode === "started"
    ? Math.max(1, Math.ceil(days))
    : Math.max(0, Math.floor(days))
}

// Build a workspace -> [chat_id] map of enabled, Telegram-linked recipients.
type Recipient = { userId: string; chatId: string }

async function recipientsByWorkspace(
  admin: ReturnType<typeof getSupabaseAdmin>,
): Promise<Map<string, Recipient[]>> {
  const { data, error } = await admin
    .from("notification_recipients")
    .select("workspace_id, user_id, users:user_id(telegram_chat_id)")
    .eq("enabled", true)
  if (error) throw new Error(error.message)

  const map = new Map<string, Recipient[]>()
  for (const row of (data ?? []) as RecipientRow[]) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users
    const chatId = user?.telegram_chat_id
    if (!chatId) continue
    const list = map.get(row.workspace_id) ?? []
    list.push({ userId: row.user_id, chatId })
    map.set(row.workspace_id, list)
  }
  return map
}

function mergeDeliveryResult(total: DeliveryRunResult, next: DeliveryRunResult): void {
  total.attempted += next.attempted
  total.sent += next.sent
  total.failed += next.failed
  total.pendingRetry += next.pendingRetry
}

function emptyDeliveryResult(): DeliveryRunResult {
  return { attempted: 0, sent: 0, failed: 0, pendingRetry: 0 }
}

function staleEventKey(eventKey: string | null, itemType: "request" | "booking", itemId: string): string {
  if (eventKey) return eventKey
  throw new Error(`Stale ${itemType} ${itemId} was claimed without an event key`)
}

async function completeStaleNotification(
  itemType: "request" | "booking",
  itemId: string,
  eventKey: string,
): Promise<void> {
  const admin = getSupabaseAdmin()
  const functionName = itemType === "request"
    ? "complete_stale_request_notification"
    : "complete_stale_booking_notification"
  const idParameter = itemType === "request" ? "p_request_id" : "p_booking_id"
  const { error } = await admin.rpc(functionName, {
    [idParameter]: itemId,
    p_event_key: eventKey,
  })
  if (error) throw new Error(error.message)
}

// A DM has no original message to reply to, so it names the item itself.
function staleDmText(title: string, note: string, reason?: string | null): string {
  return [`<b>${escapeHtml(title)}</b>`, reason ? escapeHtml(reason) : null, note].filter(Boolean).join("\n")
}

async function queueDms(
  workspaceId: string,
  recipients: Map<string, Recipient[]>,
  eventKey: string,
  eventType: "request.stale" | "booking.stale",
  text: string,
  payload: RequestStalePayload | BookingStalePayload,
): Promise<DeliveryRunResult> {
  for (const recipient of recipients.get(workspaceId) ?? []) {
    await enqueueDelivery({
      workspaceId,
      eventKey,
      eventType,
      scope: "dm",
      recipientUserId: recipient.userId,
      chatId: recipient.chatId,
      text,
      payload,
    })
  }
  return processDeliveriesForEvent(eventKey)
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (!requireAuthorizedCronGet(request, response)) return

  const admin = getSupabaseAdmin()
  const baseUrl = resolveBaseUrl()

  const [requestsResult, bookingsResult, recipients] = await Promise.all([
    admin.rpc("claim_stale_requests"),
    admin.rpc("claim_stale_bookings"),
    recipientsByWorkspace(admin),
  ])
  if (requestsResult.error || bookingsResult.error) {
    response.status(500).json({
      error: requestsResult.error?.message ?? bookingsResult.error?.message ?? "Failed to claim stale items",
    })
    return
  }
  const staleRequests = requestsResult.data
  const staleBookings = bookingsResult.data

  const requestDelivery = emptyDeliveryResult()
  const bookingDelivery = emptyDeliveryResult()

  for (const req of (staleRequests ?? []) as StaleRequestRow[]) {
    const payload: RequestStalePayload = {
      title: req.title,
      status: req.status,
      linkUrl: baseUrl ? `${baseUrl}/requests/${req.id}` : "",
      requestId: req.id,
      staleDays: String(req.stale_days ?? daysSince(req.updated_at)),
    }
    const eventKey = staleEventKey(req.stale_notification_event_key, "request", req.id)
    // Stale is a follow-up, not an announcement: the one-line note is the loud
    // reply on the request's original message(s), and the DM wraps it with the
    // request's title.
    const followUpTokens = toNoteTokens(await buildTokens(req.workspace_id, "request.stale", payload))
    const note = renderFollowUpNote("request.stale" as FollowUpEventKey, followUpTokens)
    await publishEntityFollowUp({
      entityType: "request",
      entityId: req.id,
      eventKey,
      note,
      loud: isLoudFollowUp("request.stale" as FollowUpEventKey),
    })
    mergeDeliveryResult(requestDelivery, await queueDms(req.workspace_id, recipients, `${eventKey}:dm`, "request.stale", staleDmText(req.title, note), payload))
    await completeStaleNotification("request", req.id, eventKey)
  }

  for (const bk of (staleBookings ?? []) as StaleBookingRow[]) {
    const overdue =
      bk.is_overdue ??
      (!!bk.expected_return_at &&
        !bk.returned_at &&
        new Date(bk.expected_return_at).getTime() < Date.now())
    const payload: BookingStalePayload = {
      title: bk.title,
      status: bk.status,
      linkUrl: baseUrl ? `${baseUrl}/bookings/${bk.id}` : "",
      trackingCode: bk.tracking_code,
      staleReason: overdue ? "Overdue for return" : "Not updated recently",
      staleDays: String(
        bk.stale_days ??
          (overdue
            ? daysSince(bk.expected_return_at, "started")
            : daysSince(bk.updated_at)),
      ),
    }
    const eventKey = staleEventKey(bk.stale_notification_event_key, "booking", bk.id)
    const followUpTokens = toNoteTokens(await buildTokens(bk.workspace_id, "booking.stale", payload))
    const note = renderFollowUpNote("booking.stale" as FollowUpEventKey, followUpTokens)
    await publishEntityFollowUp({
      entityType: "booking",
      entityId: bk.id,
      eventKey,
      note,
      loud: isLoudFollowUp("booking.stale" as FollowUpEventKey),
    })
    mergeDeliveryResult(bookingDelivery, await queueDms(bk.workspace_id, recipients, `${eventKey}:dm`, "booking.stale", staleDmText(bk.title, note, payload.staleReason), payload))
    await completeStaleNotification("booking", bk.id, eventKey)
  }

  response.status(200).json({
    ok: true,
    staleRequests: staleRequests?.length ?? 0,
    staleBookings: staleBookings?.length ?? 0,
    requestDeliveries: requestDelivery,
    bookingDeliveries: bookingDelivery,
  })
}
