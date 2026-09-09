import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { headerValue } from "../../server/http.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"
import { observeApiRequest } from "../../server/observability.js"
import { processPendingOutboxForEntity } from "../../server/notifications/outbox.js"
import {
  parseSignedIngestBody,
  verifyNotificationIngestSignature,
} from "../../server/notifications/signed-ingest.js"
import {
  allowSignedIngestRateLimit,
  claimSignedIngestNonce,
  parseSignedIngestMetadata,
} from "../../server/notifications/signed-ingest-replay.js"

const EVENT_TYPES = ["request.created", "request.status_changed", "request.archived"] as const

async function handleRequestNotification(request: ApiRequest, response: ApiResponse): Promise<void> {
  response.setHeader("Content-Type", "application/json")
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }
  if (!process.env.NOTIFICATIONS_INGEST_SECRET) {
    response.status(503).json({ error: "Notification ingest is not configured" })
    return
  }
  const timestamp = headerValue(request.headers, "x-notification-timestamp")
  const nonce = headerValue(request.headers, "x-notification-nonce")
  if (!verifyNotificationIngestSignature(request.body, headerValue(request.headers, "x-signature"), timestamp, nonce)) {
    response.status(401).json({ error: "Invalid notification signature" })
    return
  }
  const metadata = parseSignedIngestMetadata(timestamp, nonce)
  if (!metadata) {
    response.status(401).json({ error: "Invalid notification signature" })
    return
  }
  const body = parseSignedIngestBody(request.body, EVENT_TYPES, "request_id")
  if (!body) {
    response.status(400).json({ error: "Invalid notification payload" })
    return
  }
  if (!await allowSignedIngestRateLimit(request, response, "request")) return
  try {
    if (!await claimSignedIngestNonce(metadata)) {
      response.status(409).json({ error: "Notification has already been processed" })
      return
    }
  } catch {
    response.status(503).json({ error: "Notification ingest is temporarily unavailable" })
    return
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("requests")
    .select("id, workspace_id, status")
    .eq("id", body.entityId)
    .maybeSingle()
  if (error) {
    response.status(503).json({ error: "Request lookup is temporarily unavailable" })
    return
  }
  if (!data) {
    response.status(404).json({ error: "Request not found" })
    return
  }
  if (body.eventType === "request.status_changed" && body.status !== data.status) {
    response.status(409).json({ error: "Request status does not match the stored record" })
    return
  }
  if (body.eventType === "request.archived" && data.status !== "archived") {
    response.status(409).json({ error: "Request is not archived" })
    return
  }

  // The database trigger created the authoritative, workspace-derived outbox
  // event with the same transition. This signed endpoint can only wake that
  // row; it cannot inject a route, destination, workspace, link, or message.
  try {
    const delivery = await processPendingOutboxForEntity("request", data.id, body.eventType)
    response.status(200).json({ ok: true, workspaceId: data.workspace_id, ...delivery })
  } catch {
    response.status(503).json({ error: "Notification delivery is temporarily unavailable" })
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("notifications.requests", request, response, async () => {
    await handleRequestNotification(request, response)
  })
}
