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

const EVENT_TYPES = ["booking.created", "booking.status_changed"] as const

async function handleBookingNotification(request: ApiRequest, response: ApiResponse): Promise<void> {
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
  const body = parseSignedIngestBody(request.body, EVENT_TYPES, "booking_id")
  if (!body) {
    response.status(400).json({ error: "Invalid notification payload" })
    return
  }
  if (!await allowSignedIngestRateLimit(request, response, "booking")) return
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
    .from("bookings")
    .select("id, workspace_id, status")
    .eq("id", body.entityId)
    .maybeSingle()
  if (error) {
    response.status(503).json({ error: "Booking lookup is temporarily unavailable" })
    return
  }
  if (!data) {
    response.status(404).json({ error: "Booking not found" })
    return
  }
  if (body.eventType === "booking.status_changed" && body.status !== data.status) {
    response.status(409).json({ error: "Booking status does not match the stored record" })
    return
  }

  try {
    const delivery = await processPendingOutboxForEntity("booking", data.id, body.eventType)
    response.status(200).json({ ok: true, workspaceId: data.workspace_id, ...delivery })
  } catch {
    response.status(503).json({ error: "Notification delivery is temporarily unavailable" })
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("notifications.bookings", request, response, async () => {
    await handleBookingNotification(request, response)
  })
}
