import type { VenueBooking } from "@moc/types/venues";
import { supabase } from "@moc/data/supabase";
import { VENUE_BOOKING_SELECT, mapVenueBookingRow, type VenueBookingRow } from "./map-venue-booking";

// Postgres unique_violation. Raised when restoring a cancelled booking races
// another booking that has since claimed one of its 30-minute slots (see
// venue_booking_slots_active_key in the migration).
const UNIQUE_VIOLATION_CODE = "23505";

export async function cancelVenueBooking(id: string, reason: string): Promise<VenueBooking> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const { data, error } = await supabase
    .from("venue_bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: userData.user?.id ?? null,
      cancel_reason: reason.trim(),
    })
    .eq("id", id)
    .select(VENUE_BOOKING_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVenueBookingRow(data as unknown as VenueBookingRow);
}

/**
 * Restores a cancelled booking to 'auto'. This can legitimately fail: the
 * booking's slots were released when it was cancelled, so someone else may
 * hold them now — the database raises a unique-violation, which we turn into
 * a clear message rather than a constraint name.
 */
export async function restoreVenueBooking(id: string): Promise<VenueBooking> {
  const { data, error } = await supabase
    .from("venue_bookings")
    .update({
      status: "auto",
      cancelled_at: null,
      cancelled_by: null,
      cancel_reason: null,
    })
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
