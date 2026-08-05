import { getSupabaseAdmin } from "../../supabase-admin.js"
import { requireAuthorizedCronGet } from "../../cron-auth.js"
import { resolveBaseUrl } from "../../base-url.js"
import {
  dispatchEvent,
  renderEventText,
  type RequestStalePayload,
  type BookingStalePayload,
} from "../../notifications/dispatch.js"
import { enqueueDelivery, processDeliveriesForEvent, type DeliveryRunResult } from "../../notifications/delivery-store.js"

// Daily stale-item sweep — wired to a Vercel Cron (00:00 UTC, see
// vercel.json). Finds requests/bookings that have gone past their
// workspace stale threshold without being attended to and alerts the
// configured recipients over Telegram:
//   • group: existing event routing (notification_routes) via dispatchEvent
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
}

type RecipientRow = {
  workspace_id: string
  user_id: string
  users: { telegram_chat_id: string | null } | { telegram_chat_id: string | null }[] | null
}

const MS_PER_DAY = 86_400_000

function daysSince(iso: string | null): number {
  if (!iso) return 0
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, Math.floor((Date.now() - then) / MS_PER_DAY))
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
      staleDays: String(daysSince(req.updated_at)),
    }
    const eventKey = staleEventKey(req.stale_notification_event_key, "request", req.id)
    const group = await dispatchEvent(req.workspace_id, "request.stale", payload, { eventKey })
    mergeDeliveryResult(requestDelivery, {
      attempted: group.attempted,
      sent: group.succeeded,
      failed: group.failed,
      pendingRetry: 0,
    })
    const text = await renderEventText(req.workspace_id, "dm", "request.stale", payload)
    mergeDeliveryResult(requestDelivery, await queueDms(req.workspace_id, recipients, eventKey, "request.stale", text, payload))
    await completeStaleNotification("request", req.id, eventKey)
  }

  for (const bk of (staleBookings ?? []) as StaleBookingRow[]) {
    const overdue =
      !!bk.expected_return_at &&
      !bk.returned_at &&
      new Date(bk.expected_return_at).getTime() < Date.now()
    const payload: BookingStalePayload = {
      title: bk.title,
      status: bk.status,
      linkUrl: baseUrl ? `${baseUrl}/bookings/${bk.id}` : "",
      trackingCode: bk.tracking_code,
      staleReason: overdue ? "Overdue for return" : "Not updated recently",
      staleDays: String(daysSince(overdue ? bk.expected_return_at : bk.updated_at)),
    }
    const eventKey = staleEventKey(bk.stale_notification_event_key, "booking", bk.id)
    const group = await dispatchEvent(bk.workspace_id, "booking.stale", payload, { eventKey })
    mergeDeliveryResult(bookingDelivery, {
      attempted: group.attempted,
      sent: group.succeeded,
      failed: group.failed,
      pendingRetry: 0,
    })
    const text = await renderEventText(bk.workspace_id, "dm", "booking.stale", payload)
    mergeDeliveryResult(bookingDelivery, await queueDms(bk.workspace_id, recipients, eventKey, "booking.stale", text, payload))
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
