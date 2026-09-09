import { announceMeetingCreated, NotificationStateError } from "../../../notifications/created-announcement.js"
import { requireWorkspaceCreateOrEntityOwnership } from "../../../notifications/authorization.js"
import { DestinationInputError, parseNotificationDestinations } from "../../../notifications/destination-input.js"
import { allowAuthenticatedNotificationMutation } from "../../../notifications/mutation-rate-limit.js"
import { getSupabaseAdmin } from "../../../supabase-admin.js"
import { requireAuthenticatedUser } from "../../../auth-guard.js"
import { applyCors } from "../../../cors.js"
import { normaliseHeaders } from "../../../http.js"
import type { ApiRequest, ApiResponse } from "../../../http.js"
import { WorkspaceAccessError } from "../../../workspace-access.js"

type Body = { meetingId?: string; destinations?: unknown }

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
    .select("id, workspace_id, topic, start_time, join_url, created_by")
    .eq("id", body.meetingId)
    .maybeSingle()
  if (error) {
    console.error("Meeting notification lookup failed:", error)
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
    console.error("Meeting notification authorization failed:", error)
    response.status(503).json({ error: "Workspace access check is temporarily unavailable" })
    return
  }

  if (!await allowAuthenticatedNotificationMutation(response, userId, data.workspace_id)) return

  let destinations
  try {
    destinations = parseNotificationDestinations(body.destinations)
  } catch (error) {
    response.status(400).json({ error: error instanceof DestinationInputError ? error.message : "Invalid destinations" })
    return
  }

  let result
  try {
    result = await announceMeetingCreated({
      workspaceId: data.workspace_id,
      meetingId: data.id,
      topic: data.topic,
      startTime: data.start_time,
      joinUrl: data.join_url,
      destinations,
    })
  } catch (error) {
    if (error instanceof NotificationStateError) {
      console.error("Meeting notification state update failed:", error.cause)
      response.status(503).json({ error: "Meeting notification state is temporarily unavailable" })
      return
    }
    throw error
  }
  response.status(200).json({ ok: true, ...result })
}
