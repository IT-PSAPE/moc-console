import { getSupabaseAdmin } from "../../../server/supabase-admin.js"
import { dispatchEvent, type NotifyDestination } from "../../../server/notifications/dispatch.js"
import { requireAuthenticatedUser, AuthError } from "../../../server/auth-guard.js"
import { applyCors } from "../../../server/cors.js"
import { normaliseHeaders } from "../../../server/http.js"
import type { ApiRequest, ApiResponse } from "../../../server/http.js"

type Body = { meetingId?: string; destinations?: unknown }

// Destinations arrive from the browser. Shape-check here; dispatchEvent
// re-validates each one against the workspace's registered groups before
// sending, so an unknown or spoofed chat id simply never receives anything.
function parseDestinations(value: unknown): NotifyDestination[] | undefined {
  if (!Array.isArray(value)) return undefined

  const parsed: NotifyDestination[] = []
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue
    const { groupChatId, threadId } = entry as Record<string, unknown>
    if (typeof groupChatId !== "string" || !groupChatId) continue
    if (threadId !== null && typeof threadId !== "number") continue
    parsed.push({ groupChatId, threadId: threadId as number | null })
  }

  return parsed.length > 0 ? parsed : undefined
}


export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (applyCors(request, response)) return
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

  const destinations = parseDestinations(body.destinations)

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
    meetingId: row.id,
  }, { destinations })

  response.status(200).json({ ok: true, ...result })
}
