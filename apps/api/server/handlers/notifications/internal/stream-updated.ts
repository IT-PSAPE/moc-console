import { randomUUID } from "node:crypto"
import { requireWorkspaceCreateOrEntityOwnership } from "../../../notifications/authorization.js"
import { allowAuthenticatedNotificationMutation } from "../../../notifications/mutation-rate-limit.js"
import { enqueueOutboxEvent, processOutboxEvent } from "../../../notifications/outbox.js"
import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"
import { requireAuthenticatedUser } from "../../../auth-guard.js"
import { applyCors } from "../../../cors.js"
import { normaliseHeaders } from "../../../http.js"
import type { ApiRequest, ApiResponse } from "../../../http.js"
import { WorkspaceAccessError } from "../../../workspace-access.js"

type Body = { streamId?: string }

// A "stream.updated" follow-up: unlike stream-created, this never posts a
// new message — it edits the stream's already-sent original(s). Session
// authenticated the same way as stream-created (creator, or can_create in
// the workspace); the outbox row carries entity_type/entity_id so
// dispatchEvent can find the originals without a route lookup.
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
  if (typeof body.streamId !== "string" || !body.streamId) {
    response.status(400).json({ error: "Missing streamId" })
    return
  }

  let data: (QueryResultRow & { id: string; workspace_id: string; title: string; created_by: string }) | undefined
  try {
    ;[data] = await queryRows<QueryResultRow & { id: string; workspace_id: string; title: string; created_by: string }>(
      "SELECT id, workspace_id, title, created_by FROM public.streams WHERE id = $1 LIMIT 1",
      [body.streamId],
    )
  } catch (error) {
    console.error("Stream update notification lookup failed:", error)
    response.status(503).json({ error: "Stream lookup is temporarily unavailable" })
    return
  }
  if (!data) {
    response.status(404).json({ error: "Stream not found" })
    return
  }

  try {
    await requireWorkspaceCreateOrEntityOwnership(userId, data.workspace_id, data.created_by)
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      response.status(403).json({ error: error.message })
      return
    }
    console.error("Stream update notification authorization failed:", error)
    response.status(503).json({ error: "Workspace access check is temporarily unavailable" })
    return
  }

  if (!await allowAuthenticatedNotificationMutation(response, userId, data.workspace_id)) return

  const eventKey = `stream.updated:${data.id}:${randomUUID()}`
  try {
    await enqueueOutboxEvent({
      workspaceId: data.workspace_id,
      eventType: "stream.updated",
      entityType: "stream",
      entityId: data.id,
      eventKey,
      payload: { title: data.title },
    })
    const result = await processOutboxEvent(eventKey)
    response.status(200).json({ ok: true, ...result })
  } catch (error) {
    console.error("Stream update notification dispatch failed:", error)
    response.status(503).json({ error: "Stream update notification is temporarily unavailable" })
  }
}
