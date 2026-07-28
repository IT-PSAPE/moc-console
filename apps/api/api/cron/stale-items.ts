import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { isAuthorizedCron } from "../../server/cron-auth.js"
import { resolveBaseUrl } from "../../server/base-url.js"
import {
  dispatchEvent,
  renderEventText,
  type RequestStalePayload,
  type BookingStalePayload,
} from "../../server/notifications/dispatch.js"
import { sendTelegramMessage } from "../../server/telegram.js"

// Daily stale-item sweep — wired to a Vercel Cron (00:00 UTC, see
// vercel.json). Finds requests/bookings that have gone past their
// workspace stale threshold without being attended to and alerts the
// configured recipients over Telegram:
//   • group: existing event routing (notification_routes) via dispatchEvent
//   • DM:    every enabled notification_recipients user with a linked
//            telegram_chat_id, in that item's workspace
//
// Detection + claim happens in SQL (claim_stale_* RPCs) which atomically
// stamps stale_notified_at = now(), so each item only re-alerts once per
// threshold window even though this runs daily. Runs as the service role.

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
}

type RecipientRow = {
  workspace_id: string
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
async function recipientsByWorkspace(
  admin: ReturnType<typeof getSupabaseAdmin>,
): Promise<Map<string, string[]>> {
  const { data } = await admin
    .from("notification_recipients")
    .select("workspace_id, users:user_id(telegram_chat_id)")
    .eq("enabled", true)

  const map = new Map<string, string[]>()
  for (const row of (data ?? []) as RecipientRow[]) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users
    const chatId = user?.telegram_chat_id
    if (!chatId) continue
    const list = map.get(row.workspace_id) ?? []
    list.push(chatId)
    map.set(row.workspace_id, list)
  }
  return map
}

async function sendDms(
  workspaceId: string,
  recipients: Map<string, string[]>,
  text: string,
): Promise<number> {
  const chatIds = recipients.get(workspaceId) ?? []
  let sent = 0
  for (const chatId of chatIds) {
    await sendTelegramMessage(chatId, text, { parseMode: "HTML" })
    sent += 1
  }
  return sent
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (!isAuthorizedCron(request)) {
    response.status(401).json({ error: "Unauthorized" })
    return
  }

  const admin = getSupabaseAdmin()
  const baseUrl = resolveBaseUrl()

  const [{ data: staleRequests }, { data: staleBookings }, recipients] = await Promise.all([
    admin.rpc("claim_stale_requests"),
    admin.rpc("claim_stale_bookings"),
    recipientsByWorkspace(admin),
  ])

  let requestAlerts = 0
  let bookingAlerts = 0

  for (const req of (staleRequests ?? []) as StaleRequestRow[]) {
    const payload: RequestStalePayload = {
      title: req.title,
      status: req.status,
      linkUrl: baseUrl ? `${baseUrl}/requests/${req.id}` : "",
      requestId: req.id,
      staleDays: String(daysSince(req.updated_at)),
    }
    await dispatchEvent(req.workspace_id, "request.stale", payload)
    const text = await renderEventText(req.workspace_id, "dm", "request.stale", payload)
    requestAlerts += await sendDms(req.workspace_id, recipients, text)
  }

  for (const bk of (staleBookings ?? []) as StaleBookingRow[]) {
    const overdue =
      !!bk.expected_return_at &&
      !bk.returned_at &&
      new Date(bk.expected_return_at).getTime() < Date.now()
    const payload: BookingStalePayload = {
      title: bk.title,
      status: bk.status,
      linkUrl: baseUrl ? `${baseUrl}/equipment/bookings/${bk.id}` : "",
      trackingCode: bk.tracking_code,
      staleReason: overdue ? "Overdue for return" : "Not updated recently",
      staleDays: String(daysSince(overdue ? bk.expected_return_at : bk.updated_at)),
    }
    await dispatchEvent(bk.workspace_id, "booking.stale", payload)
    const text = await renderEventText(bk.workspace_id, "dm", "booking.stale", payload)
    bookingAlerts += await sendDms(bk.workspace_id, recipients, text)
  }

  response.status(200).json({
    ok: true,
    staleRequests: staleRequests?.length ?? 0,
    staleBookings: staleBookings?.length ?? 0,
    requestDmsSent: requestAlerts,
    bookingDmsSent: bookingAlerts,
  })
}
