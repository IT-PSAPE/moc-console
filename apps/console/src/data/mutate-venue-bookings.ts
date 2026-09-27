import type { VenueBooking } from "@moc/types/venues";
import { supabase } from "@moc/data/supabase";
import { VENUE_BOOKING_SELECT, mapVenueBookingRow, type VenueBookingRow } from "./map-venue-booking";
import { notifyEntityChanged } from "./notify-event";

// Postgres unique_violation. Raised when restoring a cancelled or rejected
// booking races another booking that has since claimed one of its 30-minute
// slots (see venue_booking_slots_active_key in the migration).
const UNIQUE_VIOLATION_CODE = "23505";

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data.user?.id ?? null;
}

async function updateVenueBooking(id: string, values: Record<string, unknown>): Promise<VenueBooking> {
  const { data, error } = await supabase
    .from("venue_bookings")
    .update(values)
    .eq("id", id)
    .select(VENUE_BOOKING_SELECT)
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION_CODE) {
      throw new Error("Those times have since been booked by someone else.");
    }
    throw new Error(error.message);
  }

  return mapVenueBookingRow(data as unknown as VenueBookingRow);
}

export async function cancelVenueBooking(id: string, reason: string): Promise<VenueBooking> {
  const userId = await getCurrentUserId();
  const booking = await updateVenueBooking(id, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancelled_by: userId,
    cancel_reason: reason.trim(),
    approved_at: null,
    approved_by: null,
  });
  notifyEntityChanged("venue_booking", id);
  return booking;
}

/**
 * Restores a cancelled or rejected booking to 'auto'. This can legitimately
 * fail: the booking's slots were released when it was cancelled or rejected,
 * so someone else may hold them now — the database raises a
 * unique-violation, which updateVenueBooking turns into a clear message
 * rather than a constraint name.
 */
export async function restoreVenueBooking(id: string): Promise<VenueBooking> {
  const booking = await updateVenueBooking(id, {
    status: "auto",
    cancelled_at: null,
    cancelled_by: null,
    cancel_reason: null,
    approved_at: null,
    approved_by: null,
    rejected_at: null,
    rejected_by: null,
  });
  notifyEntityChanged("venue_booking", id);
  return booking;
}

/** Allowed from 'auto', mirroring api_apply_telegram_action's approve transition. */
export async function approveVenueBooking(id: string): Promise<VenueBooking> {
  const userId = await getCurrentUserId();
  const booking = await updateVenueBooking(id, {
    status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: userId,
    rejected_at: null,
    rejected_by: null,
  });
  notifyEntityChanged("venue_booking", id);
  return booking;
}

/** Allowed from 'auto' or 'approved', mirroring api_apply_telegram_action's reject transition. */
export async function rejectVenueBooking(id: string): Promise<VenueBooking> {
  const userId = await getCurrentUserId();
  const booking = await updateVenueBooking(id, {
    status: "rejected",
    rejected_at: new Date().toISOString(),
    rejected_by: userId,
    approved_at: null,
    approved_by: null,
  });
  notifyEntityChanged("venue_booking", id);
  return booking;
}
