import { createHmac, timingSafeEqual } from "node:crypto"
import { dispatchEvent } from "../../server/notifications/dispatch.js"
import { isNotificationEventKey } from "../../src/data/notification-events.js"

type ApiRequest = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type BookingEventType = "booking.created" | "booking.status_changed"

type Body = {
  event_type?: string
  workspace_id?: string
  title?: string
  status?: string | null
  requester_name?: string | null
  link_url?: string
}

function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | null {
  if (!headers) return null
  const raw = headers[name] ?? headers[name.toLowerCase()]
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

// See api/notifications/requests.ts for the signing contract.
function verifySignature(body: unknown, provided: string | null): boolean {
  const secret = process.env.NOTIFICATIONS_INGEST_SECRET
  if (!secret || !provided) return false
  const expected = createHmac("sha256", secret)
    .update(JSON.stringify(body ?? {}))
    .digest("hex")
  return safeEqual(expected, provided)
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  if (!verifySignature(request.body, headerValue(request.headers, "x-signature"))) {
    response.status(401).json({ error: "Invalid signature" })
    return
  }

  const body = (request.body ?? {}) as Body
  const { event_type, workspace_id, title, link_url } = body

  if (
    typeof event_type !== "string" ||
    typeof workspace_id !== "string" || !workspace_id ||
    typeof title !== "string" || !title ||
    typeof link_url !== "string" || !link_url
  ) {
    response.status(400).json({ error: "Missing fields" })
    return
  }

  if (
    !isNotificationEventKey(event_type) ||
    (event_type !== "booking.created" && event_type !== "booking.status_changed")
  ) {
    response.status(400).json({ error: "Unsupported event_type" })
    return
  }

  const requesterName = typeof body.requester_name === "string" ? body.requester_name : null

  let result: { attempted: number; succeeded: number }
  if (event_type === "booking.status_changed") {
    if (typeof body.status !== "string" || !body.status) {
      response.status(400).json({ error: "status required for booking.status_changed" })
      return
    }
    result = await dispatchEvent(workspace_id, event_type as BookingEventType, {
      title,
      status: body.status,
      linkUrl: link_url,
    })
  } else {
    result = await dispatchEvent(workspace_id, "booking.created", {
      title,
      status: typeof body.status === "string" ? body.status : null,
      requesterName,
      linkUrl: link_url,
    })
  }

  response.status(200).json({ ok: true, ...result })
}
