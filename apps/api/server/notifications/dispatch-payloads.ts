// Payload shapes for every notification event, keyed by NotificationEventKey.
// The optional *Id / trackingCode fields drive DB enrichment (rich
// composable tokens). They're optional so older/external senders that
// omit them still work — the scalar payload fields are the fallback.

export type StreamCreatedPayload = {
  title: string
  scheduledStartTime: string | null
  streamUrl: string | null
  streamId?: string
}

export type StreamUpdatedPayload = {
  title?: string | null
  streamId: string
  changeSummary?: string | null
}

export type MeetingCreatedPayload = {
  topic: string
  startTime: string | null
  joinUrl: string | null
  meetingId?: string
}

export type MeetingUpdatedPayload = {
  topic?: string | null
  meetingId: string
  changeSummary?: string | null
}

export type RequestCreatedPayload = {
  title: string
  status: string | null
  requesterName: string | null
  linkUrl: string
  requestId?: string | null
}

export type RequestStatusChangedPayload = {
  title: string
  status: string
  requesterName?: string | null
  linkUrl: string
  requestId?: string | null
}

export type RequestArchivedPayload = {
  title: string
  requesterName?: string | null
  linkUrl: string
  requestId?: string | null
}

export type RequestStalePayload = {
  title: string
  status?: string | null
  requesterName?: string | null
  linkUrl: string
  requestId?: string | null
  staleDays?: string | null
}

export type RequestRequesterMutationPayload = RequestCreatedPayload & {
  trackingCode: string
  changeSummary: string
}

export type BookingCreatedPayload = {
  title: string
  status?: string | null
  requesterName?: string | null
  linkUrl: string
  trackingCode?: string | null
}

export type BookingStatusChangedPayload = {
  title: string
  status: string
  linkUrl: string
  trackingCode?: string | null
}

export type BookingStalePayload = {
  title: string
  status?: string | null
  linkUrl: string
  trackingCode?: string | null
  staleDays?: string | null
  staleReason?: string | null
}

export type BookingRequesterMutationPayload = BookingCreatedPayload & {
  trackingCode: string
  changeSummary: string
}

// starts_at/ends_at are the booked span, always present (NOT NULL columns).
// There is deliberately no `status` field here — the trigger that enqueues
// this event never stores one; buildTokens derives the reader-facing phase
// from the span (and, for the cancelled event, from the event itself) at
// render time, so a retried delivery reports the phase true when it is sent.
export type VenueBookingCreatedPayload = {
  title: string
  requesterName: string
  trackingCode: string
  venueName: string
  startsAt: string
  endsAt: string
  linkUrl: string
  venueBookingId?: string | null
}

export type VenueBookingCancelledPayload = VenueBookingCreatedPayload

/** Approve, reject or restore made in the console; decision is the new stored status. */
export type VenueBookingStatusChangedPayload = VenueBookingCreatedPayload & {
  decision: string
}

export type VenueBookingRequesterMutationPayload = VenueBookingCreatedPayload & {
  changeSummary: string
}

export type EventPayloadMap = {
  "stream.created": StreamCreatedPayload
  "stream.updated": StreamUpdatedPayload
  "meeting.created": MeetingCreatedPayload
  "meeting.updated": MeetingUpdatedPayload
  "request.created": RequestCreatedPayload
  "request.requester_updated": RequestRequesterMutationPayload
  "request.requester_deleted": RequestRequesterMutationPayload
  "request.status_changed": RequestStatusChangedPayload
  "request.archived": RequestArchivedPayload
  "request.stale": RequestStalePayload
  "booking.created": BookingCreatedPayload
  "booking.requester_updated": BookingRequesterMutationPayload
  "booking.requester_deleted": BookingRequesterMutationPayload
  "booking.status_changed": BookingStatusChangedPayload
  "booking.stale": BookingStalePayload
  "venue_booking.created": VenueBookingCreatedPayload
  "venue_booking.requester_updated": VenueBookingRequesterMutationPayload
  "venue_booking.requester_deleted": VenueBookingRequesterMutationPayload
  "venue_booking.cancelled": VenueBookingCancelledPayload
  "venue_booking.status_changed": VenueBookingStatusChangedPayload
}
