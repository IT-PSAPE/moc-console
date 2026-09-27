import type { VenueBooking, VenueBookingStatus } from "@moc/types/venues";

// venue:venue_id(...), event:event_id(...) and canceller:cancelled_by(...)
// embed via the FK columns on venue_bookings, mirroring the
// equipment:equipment_id(...) embed pattern in booking-row.ts. approver and
// rejecter embed the same way for the staff decision columns.
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
  recurrence,
  cancelled_at,
  cancelled_by,
  cancel_reason,
  approved_at,
  approved_by,
  rejected_at,
  rejected_by,
  created_at,
  updated_at,
  venue:venue_id(name, location),
  event:event_id(name),
  canceller:cancelled_by(name, surname),
  approver:approved_by(name, surname),
  rejecter:rejected_by(name, surname),
  slots:venue_booking_slots(occurrence_index, slot_start, slot_end)
`;

type VenueRelation = { name: string; location: string | null } | null;
type EventRelation = { name: string } | null;
type DecisionUserRelation = { name: string; surname: string } | null;
type SlotRelation = { occurrence_index: number; slot_start: string; slot_end: string };

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
  recurrence: VenueBooking["recurrence"];
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  created_at: string;
  updated_at: string;
  venue: VenueRelation;
  event: EventRelation;
  canceller: DecisionUserRelation;
  approver: DecisionUserRelation;
  rejecter: DecisionUserRelation;
  slots: SlotRelation[];
};

function mapOccurrences(slots: SlotRelation[]): VenueBooking["occurrences"] {
  const grouped = new Map<number, { index: number; startsAt: string; endsAt: string }>();
  for (const slot of slots) {
    const current = grouped.get(slot.occurrence_index);
    grouped.set(slot.occurrence_index, {
      index: slot.occurrence_index,
      startsAt: !current || slot.slot_start < current.startsAt ? slot.slot_start : current.startsAt,
      endsAt: !current || slot.slot_end > current.endsAt ? slot.slot_end : current.endsAt,
    });
  }
  return [...grouped.values()].sort((left, right) => left.index - right.index);
}

function formatDecisionUserName(user: DecisionUserRelation): string | null {
  if (!user) return null;
  const fullName = `${user.name} ${user.surname}`.trim();
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
    recurrence: row.recurrence,
    occurrences: mapOccurrences(row.slots),
    cancelledAt: row.cancelled_at,
    cancelledBy: formatDecisionUserName(row.canceller) ?? row.cancelled_by,
    cancelReason: row.cancel_reason,
    approvedAt: row.approved_at,
    approvedBy: formatDecisionUserName(row.approver) ?? row.approved_by,
    rejectedAt: row.rejected_at,
    rejectedBy: formatDecisionUserName(row.rejecter) ?? row.rejected_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
