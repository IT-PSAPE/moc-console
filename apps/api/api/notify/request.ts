import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { processPendingOutboxForEntity } from "../../server/notifications/outbox.js"
import { parsePublicNotificationWake } from "../../server/notifications/public-wake.js"
import { applyCors } from "../../server/cors.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"

// Public callers cannot create notification content. They can only wake the
// durable request.created event written by the submission transaction.
export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const wake = parsePublicNotificationWake(request.body, "request_id")
  if (!wake) {
    response.status(400).json({ error: "request_id and tracking_code are required" })
    return
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("requests")
    .select("id")
    .eq("id", wake.entityId)
    .eq("tracking_code", wake.trackingCode)
    .maybeSingle()
  if (error) {
    response.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    response.status(404).json({ error: "Request not found" })
    return
  }

  const result = await processPendingOutboxForEntity("request", data.id, "request.created")
  response.status(200).json({ ok: true, ...result })
}
