import { processPendingOutboxForEntityAcrossEventTypes } from "../../../notifications/outbox.js"
import { getSupabaseAdmin } from "../../../supabase-admin.js"
import { requireAuthenticatedUser } from "../../../auth-guard.js"
import { applyCors } from "../../../cors.js"
import { normaliseHeaders } from "../../../http.js"
import type { ApiRequest, ApiResponse } from "../../../http.js"
import { requireWorkspacePermission, WorkspaceAccessError } from "../../../workspace-access.js"
import { isUuid } from "../../../notifications/signed-ingest.js"

type EntityType = "request" | "booking" | "venue_booking"

type Body = { entityType?: string; entityId?: string }

const TABLE_BY_ENTITY_TYPE: Record<EntityType, string> = {
  request: "requests",
  booking: "bookings",
  venue_booking: "venue_bookings",
}

function isEntityType(value: unknown): value is EntityType {
  return value === "request" || value === "booking" || value === "venue_booking"
}

// Lets a console status change (start/complete/check-out/return/approve/
// reject, or any other requester/staff edit) reach Telegram immediately
// instead of waiting for the 01:00 cron: the mutation that made the change
// already enqueued the right follow-up event onto the outbox — this route
// just processes it right away, for every pending event type on that one
// entity, rather than waiting to be swept.
export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
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
  if (!isEntityType(body.entityType) || !isUuid(body.entityId)) {
    response.status(400).json({ error: "Invalid entityType or entityId" })
    return
  }
  const { entityType, entityId } = body as { entityType: EntityType; entityId: string }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from(TABLE_BY_ENTITY_TYPE[entityType])
    .select("workspace_id")
    .eq("id", entityId)
    .maybeSingle()
  if (error) {
    console.error("Entity-changed workspace lookup failed:", error)
    response.status(503).json({ error: "Lookup is temporarily unavailable" })
    return
  }
  if (!data) {
    response.status(404).json({ error: "Entity not found" })
    return
  }

  try {
    await requireWorkspacePermission(userId, data.workspace_id, "can_read")
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      response.status(403).json({ error: error.message })
      return
    }
    console.error("Entity-changed authorization failed:", error)
    response.status(503).json({ error: "Workspace access check is temporarily unavailable" })
    return
  }

  try {
    const result = await processPendingOutboxForEntityAcrossEventTypes(entityType, entityId)
    response.status(200).json({ ok: true, ...result })
  } catch (error) {
    console.error("Entity-changed outbox processing failed:", error)
    response.status(503).json({ error: "Notification processing is temporarily unavailable" })
  }
}
