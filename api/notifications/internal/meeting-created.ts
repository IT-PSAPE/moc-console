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

type Body = { meetingId?: string }

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
  if (typeof body.meetingId !== "string" || !body.meetingId) {
    response.status(400).json({ error: "Missing meetingId" })
    return
  }

  const admin = getSupabaseAdmin()
  const { data: claimed } = await admin
    .from("zoom_meetings")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", body.meetingId)
    .is("notified_at", null)
    .select("id, workspace_id, topic, start_time, join_url")
    .maybeSingle()

  if (!claimed) {
    response.status(200).json({ ok: true, skipped: "already_notified_or_missing" })
    return
  }

  type MeetingRow = {
    id: string
    workspace_id: string
    topic: string
    start_time: string | null
    join_url: string | null
  }
  const row = claimed as MeetingRow

  const result = await dispatchEvent(row.workspace_id, "meeting.created", {
    topic: row.topic,
    startTime: row.start_time,
    joinUrl: row.join_url,
  })

  response.status(200).json({ ok: true, ...result })
}
