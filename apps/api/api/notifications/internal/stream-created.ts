import { getSupabaseAdmin } from "../../../server/supabase-admin.js"
import { dispatchEvent, type NotifyDestination } from "../../../server/notifications/dispatch.js"
import { requireAuthenticatedUser, AuthError } from "../../../server/auth-guard.js"
import { applyCors } from "../../../server/cors.js"
import { normaliseHeaders } from "../../../server/http.js"
import type { ApiRequest, ApiResponse } from "../../../server/http.js"

type Body = { streamId?: string; destinations?: unknown }

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
  if (typeof body.streamId !== "string" || !body.streamId) {
    response.status(400).json({ error: "Missing streamId" })
    return
  }

  const destinations = parseDestinations(body.destinations)

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
    streamId: row.id,
  }, { destinations })

  response.status(200).json({ ok: true, ...result })
}
