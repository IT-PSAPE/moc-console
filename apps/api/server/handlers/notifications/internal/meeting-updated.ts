import { randomUUID } from "node:crypto"
import { requireWorkspaceCreateOrEntityOwnership } from "../../../notifications/authorization.js"
import { allowAuthenticatedNotificationMutation } from "../../../notifications/mutation-rate-limit.js"
import { enqueueOutboxEvent, processOutboxEvent } from "../../../notifications/outbox.js"
import { getSupabaseAdmin } from "../../../supabase-admin.js"
import { requireAuthenticatedUser } from "../../../auth-guard.js"
import { applyCors } from "../../../cors.js"
import { normaliseHeaders } from "../../../http.js"
import type { ApiRequest, ApiResponse } from "../../../http.js"
import { WorkspaceAccessError } from "../../../workspace-access.js"

type Body = { meetingId?: string }

// A "meeting.updated" follow-up: mirrors stream-updated.ts exactly, for
// zoom_meetings. See its comment for why this never posts a new message.
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
  } catch {
    response.status(401).json({ error: "Unauthorized" })
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
    .select("id, workspace_id, topic, created_by")
    .eq("id", body.meetingId)
    .maybeSingle()
  if (error) {
    console.error("Meeting update notification lookup failed:", error)
    response.status(503).json({ error: "Meeting lookup is temporarily unavailable" })
    return
  }
  if (!data) {
    response.status(404).json({ error: "Meeting not found" })
    return
  }

  try {
    await requireWorkspaceCreateOrEntityOwnership(userId, data.workspace_id, data.created_by)
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      response.status(403).json({ error: error.message })
      return
    }
    console.error("Meeting update notification authorization failed:", error)
    response.status(503).json({ error: "Workspace access check is temporarily unavailable" })
    return
  }

  if (!await allowAuthenticatedNotificationMutation(response, userId, data.workspace_id)) return

  const eventKey = `meeting.updated:${data.id}:${randomUUID()}`
  try {
    await enqueueOutboxEvent({
      workspaceId: data.workspace_id,
      eventType: "meeting.updated",
      entityType: "meeting",
      entityId: data.id,
      eventKey,
      payload: { topic: data.topic },
    })
    const result = await processOutboxEvent(eventKey)
    response.status(200).json({ ok: true, ...result })
  } catch (error) {
    console.error("Meeting update notification dispatch failed:", error)
    response.status(503).json({ error: "Meeting update notification is temporarily unavailable" })
  }
}
