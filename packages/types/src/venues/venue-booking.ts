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
  trackingCode: string;
  title: string;
  requestedBy: string;
  who: string;
  what: string;
  when: string;
  where: string;
  why: string;
  how: string;
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
