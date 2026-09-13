import type { VenueBookingStatus } from "./status";

/** One booked 30-minute slot. A booking always holds a continuous run of them. */
export type VenueBookingSlot = {
  id: string;
  slotStart: string;
  slotEnd: string;
};

export type VenueBooking = {
  id: string;
  workspaceId: string;
  venueId: string;
  venueName: string;
  venueLocation: string | null;
  /**
   * The chosen event, or null when the submitter picked "Other" and typed
   * their own description into eventOther. Exactly one of the two is set —
   * read them through venueBookingEventLabel rather than branching in UI.
   */
  eventId: string | null;
  eventName: string | null;
  eventOther: string | null;
  trackingCode: string;
  title: string;
  requestedBy: string;
  notes: string | null;
  /**
   * The stored state, which is only ever 'auto' or 'cancelled'. For the
   * status a reader should see, call deriveVenueBookingPhase — do not branch
   * on this field in UI.
   */
  status: VenueBookingStatus;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * What the booking is for, however it was named. Bookings made before events
 * existed have neither side set, and fall back to their title.
 */
export function venueBookingEventLabel(booking: VenueBooking): string {
  return booking.eventName ?? booking.eventOther ?? booking.title;
}

/** Whether the submitter described the event themselves instead of choosing one. */
export function isOtherVenueBookingEvent(booking: VenueBooking): boolean {
  return booking.eventName === null && booking.eventOther !== null;
}
