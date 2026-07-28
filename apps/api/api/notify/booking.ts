import { dispatchEvent } from "../../server/notifications/dispatch.js"
import { resolveBaseUrl } from "../../server/base-url.js"
import { applyCors } from "../../server/cors.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"

// Public, unauthenticated entry point used by MOC Request (the anonymous PWA)
// to announce a booking event. See the sibling request.ts for why the old
// HMAC-and-forward hop to the console is gone.

type BookingEventType = "booking.created" | "booking.status_changed"

type Body = {
  event_type?: BookingEventType
  workspace_id?: string
  booking_id?: string
  tracking_code?: string
  title?: string
  requester_name?: string | null
  status?: string | null
}

// Deep-link straight to the booking's detail page when we know its id; fall
// back to the bookings list otherwise (the message body also carries the
// tracking code).
function bookingLink(base: string, bookingId: string | null): string {
  return bookingId
    ? `${base}/bookings/${encodeURIComponent(bookingId)}`
    : `${base}/bookings`
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const body = (request.body ?? {}) as Body
  const { event_type, workspace_id, tracking_code, title } = body
  const bookingId = typeof body.booking_id === "string" ? body.booking_id : null

  if (
    !event_type ||
    typeof workspace_id !== "string" || !workspace_id ||
    typeof tracking_code !== "string" || !tracking_code ||
    typeof title !== "string" || !title
  ) {
    response.status(400).json({ error: "Missing fields" })
    return
  }

  if (event_type !== "booking.created" && event_type !== "booking.status_changed") {
    response.status(400).json({ error: "Unsupported event_type" })
    return
  }

  const base = resolveBaseUrl()
  if (!base) {
    response.status(200).json({ ok: true, skipped: "no_base_url" })
    return
  }

  const linkUrl = bookingLink(base, bookingId)

  let result: { attempted: number; succeeded: number }
  if (event_type === "booking.status_changed") {
    if (typeof body.status !== "string" || !body.status) {
      response.status(400).json({ error: "status required for booking.status_changed" })
      return
    }
    result = await dispatchEvent(workspace_id, event_type, {
      title,
      status: body.status,
      linkUrl,
      trackingCode: tracking_code,
    })
  } else {
    result = await dispatchEvent(workspace_id, "booking.created", {
      title,
      status: typeof body.status === "string" ? body.status : null,
      requesterName: typeof body.requester_name === "string" ? body.requester_name : null,
      linkUrl,
      trackingCode: tracking_code,
    })
  }

  response.status(200).json({ ok: true, ...result })
}
