import { createHmac } from "node:crypto"

// Vercel serverless function. Signs the outbound payload with the shared
// HMAC secret and forwards it to moc-console's /api/notifications/bookings.
// Kept server-side so NOTIFICATIONS_INGEST_SECRET never leaks to browsers.

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

type ClientBody = {
  event_type?: "booking.created" | "booking.status_changed"
  workspace_id?: string
  tracking_code?: string
  title?: string
  requester_name?: string | null
  status?: string | null
}

function resolveLinkUrl(): string | null {
  const base = process.env.MOC_CONSOLE_BASE_URL
  if (!base) return null
  // moc-console doesn't (yet) have a per-booking detail route — link the
  // bookings list. The Telegram message includes the tracking code in body.
  return `${base.replace(/\/$/, "")}/equipment/bookings`
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const secret = process.env.NOTIFICATIONS_INGEST_SECRET
  const target = process.env.MOC_CONSOLE_BASE_URL
  if (!secret || !target) {
    response.status(200).json({ ok: true, skipped: "not_configured" })
    return
  }

  const body = (request.body ?? {}) as ClientBody
  const { event_type, workspace_id, tracking_code, title } = body

  if (
    !event_type ||
    typeof workspace_id !== "string" || !workspace_id ||
    typeof tracking_code !== "string" || !tracking_code ||
    typeof title !== "string" || !title
  ) {
    response.status(400).json({ error: "Missing fields" })
    return
  }

  const linkUrl = resolveLinkUrl()
  if (!linkUrl) {
    response.status(500).json({ error: "MOC_CONSOLE_BASE_URL not set" })
    return
  }

  const payload: Record<string, unknown> = {
    event_type,
    workspace_id,
    title,
    link_url: linkUrl,
    requester_name: typeof body.requester_name === "string" ? body.requester_name : null,
  }
  if (event_type === "booking.status_changed") {
    if (typeof body.status !== "string" || !body.status) {
      response.status(400).json({ error: "status required for booking.status_changed" })
      return
    }
    payload.status = body.status
  } else if (typeof body.status === "string") {
    payload.status = body.status
  }

  const serialised = JSON.stringify(payload)
  const signature = createHmac("sha256", secret).update(serialised).digest("hex")

  try {
    const upstream = await fetch(`${target.replace(/\/$/, "")}/api/notifications/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
      },
      body: serialised,
    })
    const json = await upstream.json().catch(() => ({}))
    response.status(upstream.ok ? 200 : 502).json({ ok: upstream.ok, upstream: json })
  } catch (error) {
    response.status(502).json({
      error: "Upstream call failed",
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}
