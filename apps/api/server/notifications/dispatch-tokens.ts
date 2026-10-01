// Builds the {{token}} values a template renders against, and renders the
// event's template text. Split out of dispatch.ts to keep it under the file
// size limit.

import {
  formatDateTokens,
  renderTemplate,
  telegramStatusLabel,
  type AnnouncementEventKey,
  type NotificationEventKey,
  type TemplateScope,
  type TokenValues,
} from "@moc/notifications"
import { resolveTemplate } from "./templates.js"
import { fetchFormatSettings } from "./format-settings.js"
import {
  enrichBooking,
  enrichRequest,
  enrichStream,
  enrichMeeting,
  enrichVenueBooking,
} from "./enrich.js"
import type {
  EventPayloadMap,
  RequestCreatedPayload,
  RequestStatusChangedPayload,
  RequestArchivedPayload,
  RequestRequesterMutationPayload,
  BookingCreatedPayload,
  BookingStatusChangedPayload,
  BookingRequesterMutationPayload,
  VenueBookingCreatedPayload,
  VenueBookingCancelledPayload,
  VenueBookingStatusChangedPayload,
  VenueBookingRequesterMutationPayload,
  StreamCreatedPayload,
  StreamUpdatedPayload,
  MeetingCreatedPayload,
  MeetingUpdatedPayload,
} from "./dispatch-payloads.js"

// Human labels for the reader-facing venue booking phase. Mirrors
// packages/types/src/venues/constants.ts (venueBookingPhaseLabel) — the two
// must stay in step, same as deriveVenueBookingPhase mirrors phase.ts.
export const venueBookingPhaseLabel: Record<string, string> = {
  booked: "Booked",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

// Normalise to ISO; the workspace zone/format is applied later by
// renderEventText via formatDateTokens (scheduledStartTime/startTime are
// localised date tokens).
export function formatScheduled(scheduled: string | null): string | null {
  if (!scheduled) return null
  const date = new Date(scheduled)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

// Mirrors public.venue_booking_phase() / packages/types/src/venues/phase.ts
// exactly: cancelled/rejected are decisions that win outright, then the
// clock against the booked span, then the approval decision. Pure and takes
// `now` as a parameter so a message that sits in the outbox and is retried
// later reports the phase true at send time, never the phase true when the
// event was enqueued.
export function deriveVenueBookingPhase(
  status: string,
  startsAt: string,
  endsAt: string,
  now: Date = new Date(),
): string {
  if (status === "cancelled" || status === "rejected") return status
  if (now >= new Date(endsAt)) return "completed"
  if (now >= new Date(startsAt)) return "in_progress"
  return status === "approved" ? "approved" : "booked"
}

// Slots are always contiguous 30-minute blocks (enforced by
// public_submit_venue_booking), so the count is exact from the span alone —
// no need to join venue_booking_slots just to count rows.
export function venueBookingSlotCount(startsAt: string, endsAt: string): number {
  const minutes = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000
  return Math.max(0, Math.round(minutes / 30))
}

export function formatVenueBookingDuration(startsAt: string, endsAt: string): string {
  const minutes = Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${minutes} min`
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

// renderFollowUpNote (and the rest of the note vocabulary in
// @moc/notifications) takes plain Record<string, string> — no null/undefined
// — since a note only ever substitutes an already-known, present value.
// TokenValues (this app's enrichment/payload token map) is nullable, so this
// is the one conversion point between the two.
export function toNoteTokens(tokens: TokenValues): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(tokens)) {
    out[k] = v ?? ""
  }
  return out
}

function nonEmpty(values: TokenValues): TokenValues {
  const out: TokenValues = {}
  for (const [k, v] of Object.entries(values)) {
    if (v != null && v !== "") out[k] = v
  }
  return out
}

// Flatten a payload into the {{token}} values the renderer substitutes,
// enriched with the full DB record when an entity id is present. The
// scalar payload fields always win for the keys they carry (so the
// freshly-built link and event-authoritative status never regress);
// enrichment supplies the extra composable tokens.
export async function buildTokens<K extends NotificationEventKey>(
  workspaceId: string,
  eventType: K,
  payload: EventPayloadMap[K],
): Promise<TokenValues> {
  switch (eventType) {
    case "stream.created": {
      const p = payload as StreamCreatedPayload
      const base: TokenValues = {
        title: p.title,
        scheduledStartTime: formatScheduled(p.scheduledStartTime),
        streamUrl: p.streamUrl,
      }
      const enriched = p.streamId ? await enrichStream(p.streamId) : {}
      return { ...enriched, ...nonEmpty(base) }
    }
    case "stream.updated": {
      const p = payload as StreamUpdatedPayload
      const enriched = await enrichStream(p.streamId)
      return { ...enriched, ...nonEmpty({ title: p.title, changeSummary: p.changeSummary }) }
    }
    case "meeting.created": {
      const p = payload as MeetingCreatedPayload
      const base: TokenValues = {
        topic: p.topic,
        startTime: formatScheduled(p.startTime),
        joinUrl: p.joinUrl,
      }
      const enriched = p.meetingId ? await enrichMeeting(p.meetingId) : {}
      return { ...enriched, ...nonEmpty(base) }
    }
    case "meeting.updated": {
      const p = payload as MeetingUpdatedPayload
      const enriched = await enrichMeeting(p.meetingId)
      return { ...enriched, ...nonEmpty({ topic: p.topic, changeSummary: p.changeSummary }) }
    }
    case "request.created":
    case "request.requester_updated":
    case "request.requester_deleted":
    case "request.status_changed":
    case "request.archived": {
      const p = payload as RequestCreatedPayload &
        RequestStatusChangedPayload &
        RequestArchivedPayload
      const requesterMutation = p as Partial<RequestRequesterMutationPayload>
      const base: TokenValues = {
        title: p.title,
        status: p.status ? telegramStatusLabel("request", p.status) : undefined,
        requesterName: p.requesterName,
        trackingCode: requesterMutation.trackingCode,
        changeSummary: requesterMutation.changeSummary,
        linkUrl: p.linkUrl,
      }
      const enriched = p.requestId ? await enrichRequest(p.requestId) : {}
      // linkUrl always from payload (built with the console base URL).
      return { ...enriched, ...nonEmpty(base), linkUrl: p.linkUrl }
    }
    case "booking.created":
    case "booking.requester_updated":
    case "booking.requester_deleted":
    case "booking.status_changed": {
      const p = payload as BookingCreatedPayload &
        BookingStatusChangedPayload
      const requesterMutation = p as Partial<BookingRequesterMutationPayload>
      const base: TokenValues = {
        title: p.title,
        status: p.status ? telegramStatusLabel("booking", p.status) : undefined,
        requesterName: p.requesterName,
        changeSummary: requesterMutation.changeSummary,
        linkUrl: p.linkUrl,
      }
      const enriched = p.trackingCode
        ? await enrichBooking(p.trackingCode, workspaceId)
        : {}
      return { ...enriched, ...nonEmpty(base), linkUrl: p.linkUrl }
    }
    case "venue_booking.created":
    case "venue_booking.requester_updated":
    case "venue_booking.requester_deleted":
    case "venue_booking.cancelled":
    case "venue_booking.status_changed": {
      const p = payload as VenueBookingCreatedPayload & VenueBookingCancelledPayload & Partial<VenueBookingStatusChangedPayload>
      const requesterMutation = p as Partial<VenueBookingRequesterMutationPayload>
      // Enrich first: the live row is what decides the phase, and it has to be
      // in hand before deriving it.
      const enriched = p.venueBookingId ? await enrichVenueBooking(p.venueBookingId) : {}
      // The firing event covers the cancellation itself; the row's own
      // cancelled_at covers a `created` message that sat in the outbox and is
      // being retried after the booking was cancelled — without it, that late
      // delivery would announce a dead booking as "Booked". Cancelled beats
      // the clock, exactly as public.venue_booking_phase() has it.
      const cancelled =
        eventType === "venue_booking.cancelled" || Boolean(enriched.cancelledAt)
      const storedStatus = cancelled
        ? "cancelled"
        : typeof enriched.storedStatus === "string"
          ? enriched.storedStatus
          : "auto"
      const phase = deriveVenueBookingPhase(storedStatus, p.startsAt, p.endsAt)
      const base: TokenValues = {
        title: p.title,
        requesterName: p.requesterName,
        trackingCode: p.trackingCode,
        venueName: p.venueName,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        status: venueBookingPhaseLabel[phase] ?? phase,
        slotCount: String(venueBookingSlotCount(p.startsAt, p.endsAt)),
        duration: formatVenueBookingDuration(p.startsAt, p.endsAt),
        changeSummary: requesterMutation.changeSummary,
        decision: p.decision,
        linkUrl: p.linkUrl,
      }
      return { ...enriched, ...nonEmpty(base), linkUrl: p.linkUrl }
    }
    default:
      return {}
  }
}

// Resolve the workspace's template for (scope, eventType) and render it
// against the enriched tokens. Only announcement events are templatable —
// see the shared Telegram contract's messaging model — so this is bounded
// to AnnouncementEventKey; a follow-up's text is renderFollowUpNote's note,
// never a per-event template.
export async function renderEventText<K extends AnnouncementEventKey>(
  workspaceId: string,
  scope: TemplateScope,
  eventType: K,
  payload: EventPayloadMap[K],
): Promise<string> {
  const [template, format, tokens] = await Promise.all([
    resolveTemplate(workspaceId, scope, eventType),
    fetchFormatSettings(workspaceId),
    buildTokens(workspaceId, eventType, payload),
  ])
  return renderTemplate(
    template,
    formatDateTokens(tokens, format.timezone, format.dateFormat),
  )
}
