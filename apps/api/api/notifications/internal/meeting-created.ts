import { enqueueOutboxEvent, processOutboxEvent } from "../../../server/notifications/outbox.js"
import { requireWorkspaceMembership } from "../../../server/notifications/authorization.js"
import { getSupabaseAdmin } from "../../../server/supabase-admin.js"
import { requireAuthenticatedUser, AuthError } from "../../../server/auth-guard.js"
import { applyCors } from "../../../server/cors.js"
import { normaliseHeaders } from "../../../server/http.js"
import type { ApiRequest, ApiResponse } from "../../../server/http.js"

type Body = { meetingId?: string; destinations?: unknown }

function parseDestinations(value: unknown): { groupChatId: string; threadId: number | null }[] | undefined {
  if (!Array.isArray(value)) return undefined
  const parsed: { groupChatId: string; threadId: number | null }[] = []
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

  let userId: string
  try {
    userId = (await requireAuthenticatedUser(normaliseHeaders(request.headers))).userId
  } catch (error) {
    response.status(401).json({ error: error instanceof AuthError ? error.message : "Unauthorized" })
    return
  }

  const body = (request.body ?? {}) as Body
  if (typeof body.meetingId !== "string" || !body.meetingId) {
    response.status(400).json({ error: "Missing meetingId" })
    return
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("zoom_meetings")
    .select("id, workspace_id, topic, start_time, join_url")
    .eq("id", body.meetingId)
    .maybeSingle()
  if (error) {
    response.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    response.status(404).json({ error: "Meeting not found" })
    return
  }

  try {
    await requireWorkspaceMembership(userId, data.workspace_id)
  } catch (error) {
    response.status(403).json({ error: error instanceof Error ? error.message : "Forbidden" })
    return
  }

  const eventKey = `meeting.created:${data.id}`
  const destinations = parseDestinations(body.destinations)
  await enqueueOutboxEvent({
    workspaceId: data.workspace_id,
    eventType: "meeting.created",
    entityType: "meeting",
    entityId: data.id,
    eventKey,
    payload: {
      topic: data.topic,
      startTime: data.start_time,
      joinUrl: data.join_url,
      ...(destinations ? { destinations } : {}),
    },
  })
  const { error: markError } = await admin
    .from("zoom_meetings")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("notified_at", null)
  if (markError) {
    response.status(500).json({ error: markError.message })
    return
  }
  const result = await processOutboxEvent(eventKey)
  response.status(200).json({ ok: true, ...result })
}
