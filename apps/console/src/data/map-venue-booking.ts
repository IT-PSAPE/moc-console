import type { VenueBooking, VenueBookingStatus } from "@moc/types/venues";

// venue:venue_id(...), event:event_id(...) and canceller:cancelled_by(...)
// embed via the FK columns on venue_bookings, mirroring the
// equipment:equipment_id(...) embed pattern in booking-row.ts.
export const VENUE_BOOKING_SELECT = `
  id,
  workspace_id,
  venue_id,
  event_id,
  event_other,
  tracking_code,
  title,
  requested_by,
  notes,
  status,
  starts_at,
  ends_at,
  cancelled_at,
  cancelled_by,
  cancel_reason,
  created_at,
  updated_at,
  venue:venue_id(name, location),
  event:event_id(name),
  canceller:cancelled_by(name, surname)
`;

type VenueRelation = { name: string; location: string | null } | null;
type EventRelation = { name: string } | null;
type CancellerRelation = { name: string; surname: string } | null;

export type VenueBookingRow = {
  id: string;
  workspace_id: string;
  venue_id: string;
  event_id: string | null;
  event_other: string | null;
  tracking_code: string;
  title: string;
  requested_by: string;
  notes: string | null;
  status: VenueBookingStatus;
  starts_at: string;
  ends_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  venue: VenueRelation;
  event: EventRelation;
  canceller: CancellerRelation;
};

function formatCancellerName(canceller: CancellerRelation): string | null {
  if (!canceller) return null;
  const fullName = `${canceller.name} ${canceller.surname}`.trim();
  return fullName || null;
}

/** Convert a snake_case Supabase row (joined to venues and events, and to users when cancelled) to a camelCase VenueBooking. */
export function mapVenueBookingRow(row: VenueBookingRow): VenueBooking {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    venueId: row.venue_id,
    venueName: row.venue?.name ?? "Unknown venue",
    venueLocation: row.venue?.location ?? null,
    eventId: row.event_id,
    eventName: row.event?.name ?? null,
    eventOther: row.event_other,
    trackingCode: row.tracking_code,
    title: row.title,
    requestedBy: row.requested_by,
    notes: row.notes,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    cancelledAt: row.cancelled_at,
    cancelledBy: formatCancellerName(row.canceller) ?? row.cancelled_by,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
