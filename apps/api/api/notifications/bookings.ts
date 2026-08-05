import { createHmac, timingSafeEqual } from "node:crypto"
import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { headerValue } from "../../server/http.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"

type BookingEventType = "booking.created" | "booking.status_changed"

type Body = { event_type?: BookingEventType; booking_id?: string; status?: string | null }

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function verifySignature(body: unknown, provided: string | null): boolean {
  const secret = process.env.NOTIFICATIONS_INGEST_SECRET
  if (!secret || !provided) return false
  const expected = createHmac("sha256", secret).update(JSON.stringify(body ?? {})).digest("hex")
  return safeEqual(expected, provided)
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }
  if (!verifySignature(request.body, headerValue(request.headers, "x-signature"))) {
    response.status(401).json({ error: "Invalid signature" })
    return
  }

  const body = (request.body ?? {}) as Body
  if (!body.event_type || typeof body.booking_id !== "string" || !body.booking_id) {
    response.status(400).json({ error: "event_type and booking_id are required" })
    return
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("bookings")
    .select("id, workspace_id, status")
    .eq("id", body.booking_id)
    .maybeSingle()
  if (error) {
    response.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    response.status(404).json({ error: "Booking not found" })
    return
  }
  if (body.event_type === "booking.status_changed" && body.status !== data.status) {
    response.status(409).json({ error: "Booking status does not match the stored record" })
    return
  }

  response.status(202).json({ ok: true, accepted: true, workspaceId: data.workspace_id })
}
