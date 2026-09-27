// Fresh, entity-scoped tokens and stored status — used by follow-ups
// (re-rendering an announcement's original message from the *current* row,
// not the stale payload it was first sent with) and by announcement dispatch
// (the keyboard needs the entity's current stored status, not the phase).

import type { NotificationEntityType } from "@moc/notifications"
import type { TokenValues } from "@moc/notifications"
import { getSupabaseAdmin } from "../supabase-admin.js"
import { resolveBaseUrl } from "../base-url.js"
import {
  enrichBooking,
  enrichMeeting,
  enrichRequest,
  enrichStream,
  enrichVenueBooking,
} from "./enrich.js"

function entityLinkUrl(entityType: NotificationEntityType, entityId: string): string {
  const baseUrl = resolveBaseUrl()
  if (!baseUrl) return ""
  const segment =
    entityType === "request" ? "requests" :
    entityType === "booking" ? "bookings" :
    entityType === "venue_booking" ? "venues" :
    null
  if (!segment) return ""
  return `${baseUrl}/${segment}/${encodeURIComponent(entityId)}`
}

async function bookingTrackingCode(bookingId: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin.from("bookings").select("tracking_code").eq("id", bookingId).maybeSingle()
  return data?.tracking_code ?? null
}

/**
 * Fresh tokens for an entity, straight off the current row — never off a
 * delivery's stored payload. Used to re-render a follow-up's original
 * message so it reflects what changed, not what the announcement said.
 * Best-effort throughout (mirrors every enrich* function): a deleted or
 * otherwise unreadable entity returns {} rather than throwing, so a
 * follow-up for a gone entity can still proceed to its delete/skip path
 * instead of crashing enrichment.
 */
export async function buildFreshEntityTokens(
  workspaceId: string,
  entityType: NotificationEntityType,
  entityId: string,
): Promise<TokenValues> {
  switch (entityType) {
    case "request": {
      const enriched = await enrichRequest(entityId)
      return { ...enriched, linkUrl: entityLinkUrl(entityType, entityId) }
    }
    case "booking": {
      const trackingCode = await bookingTrackingCode(entityId).catch(() => null)
      const enriched = trackingCode ? await enrichBooking(trackingCode, workspaceId) : {}
      return { ...enriched, linkUrl: entityLinkUrl(entityType, entityId) }
    }
    case "venue_booking": {
      const enriched = await enrichVenueBooking(entityId)
      return { ...enriched, linkUrl: entityLinkUrl(entityType, entityId) }
    }
    case "stream":
      return enrichStream(entityId)
    case "meeting":
      return enrichMeeting(entityId)
    default:
      return {}
  }
}

const STATUS_TABLE: Partial<Record<NotificationEntityType, string>> = {
  request: "requests",
  booking: "bookings",
  venue_booking: "venue_bookings",
}

/**
 * The entity's current stored status column — 'not_started'/'booked'/'auto'
 * etc, never the derived reader-facing phase. Inline action keyboards are
 * built off this. Returns null for entity types with no status (stream,
 * meeting) or when the row can no longer be found (e.g. deleted).
 */
export async function fetchEntityStoredStatus(
  entityType: NotificationEntityType,
  entityId: string,
): Promise<string | null> {
  const table = STATUS_TABLE[entityType]
  if (!table) return null
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.from(table).select("status").eq("id", entityId).maybeSingle()
    if (error || !data) return null
    return typeof data.status === "string" ? data.status : null
  } catch {
    return null
  }
}
