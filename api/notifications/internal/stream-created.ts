import { getSupabaseAdmin } from "../../../server/supabase-admin.js"
import { dispatchEvent } from "../../../server/notifications/dispatch.js"
import { requireAuthenticatedUser, AuthError } from "../../../server/auth-guard.js"

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

type Body = { streamId?: string }

function normaliseHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string | undefined> {
  if (!headers) return {}
  const out: Record<string, string | undefined> = {}
  for (const [name, value] of Object.entries(headers)) {
    out[name] = Array.isArray(value) ? value[0] : value
  }
  return out
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    await requireAuthenticatedUser(normaliseHeaders(request.headers))
  } catch (error) {
    if (error instanceof AuthError) {
      response.status(401).json({ error: error.message })
      return
    }
    response.status(401).json({ error: "Unauthorized" })
    return
  }

  const body = (request.body ?? {}) as Body
  if (typeof body.streamId !== "string" || !body.streamId) {
    response.status(400).json({ error: "Missing streamId" })
    return
  }

  // Atomic claim: only the first call where notified_at IS NULL gets a row back.
  const admin = getSupabaseAdmin()
  const { data: claimed } = await admin
    .from("streams")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", body.streamId)
    .is("notified_at", null)
    .select("id, workspace_id, title, scheduled_start_time, stream_url")
    .maybeSingle()

  if (!claimed) {
    response.status(200).json({ ok: true, skipped: "already_notified_or_missing" })
    return
  }

  type StreamRow = {
    id: string
    workspace_id: string
    title: string
    scheduled_start_time: string | null
    stream_url: string | null
  }
  const row = claimed as StreamRow

  const result = await dispatchEvent(row.workspace_id, "stream.created", {
    title: row.title,
    scheduledStartTime: row.scheduled_start_time,
    streamUrl: row.stream_url,
  })

  response.status(200).json({ ok: true, ...result })
}
