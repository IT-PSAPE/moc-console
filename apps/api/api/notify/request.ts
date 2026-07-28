import { dispatchEvent } from "../../server/notifications/dispatch.js"
import { resolveBaseUrl } from "../../server/base-url.js"
import { applyCors } from "../../server/cors.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"

// Public, unauthenticated entry point used by MOC Request (the anonymous PWA)
// to announce a request event. It was always unauthenticated — before the API
// split it HMAC-signed the payload and forwarded it over HTTP to the console's
// /api/notifications/requests. Now that both live in this app the hop is gone
// and we call the dispatcher directly; /api/notifications/requests keeps its
// HMAC check for genuinely external senders.

type RequestEventType =
  | "request.created"
  | "request.status_changed"
  | "request.archived"

type Body = {
  event_type?: RequestEventType
  workspace_id?: string
  request_id?: string
  title?: string
  requester_name?: string | null
  status?: string | null
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const body = (request.body ?? {}) as Body
  const { event_type, workspace_id, request_id, title } = body

  if (
    !event_type ||
    typeof workspace_id !== "string" || !workspace_id ||
    typeof request_id !== "string" || !request_id ||
    typeof title !== "string" || !title
  ) {
    response.status(400).json({ error: "Missing fields" })
    return
  }

  if (
    event_type !== "request.created" &&
    event_type !== "request.status_changed" &&
    event_type !== "request.archived"
  ) {
    response.status(400).json({ error: "Unsupported event_type" })
    return
  }

  const base = resolveBaseUrl()
  if (!base) {
    // Console URL not configured (typically local dev) — no-op rather than
    // 500, so a submission never fails on a notification the sender can't fix.
    response.status(200).json({ ok: true, skipped: "no_base_url" })
    return
  }

  if (event_type === "request.status_changed" && (typeof body.status !== "string" || !body.status)) {
    response.status(400).json({ error: "status required for request.status_changed" })
    return
  }

  const result = await dispatchEvent(workspace_id, event_type, {
    title,
    status: typeof body.status === "string" ? body.status : null,
    requesterName: typeof body.requester_name === "string" ? body.requester_name : null,
    linkUrl: `${base}/requests/${encodeURIComponent(request_id)}`,
    requestId: request_id,
  })

  response.status(200).json({ ok: true, ...result })
}
