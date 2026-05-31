import type { Booking } from "@moc/types/equipment/booking";
import { supabase } from "@moc/data/supabase";
import { BOOKING_SELECT, type BookingRow, mapBookingRow } from "./booking-row";

// Title is intentionally not in the update payload — bookings are owned by the
// requester via MOC Request; the console can amend lifecycle/dates/notes but
// not relabel the submission.
export async function updateBooking(booking: Booking): Promise<Booking> {
  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      booked_by: booking.bookedBy,
      checked_out_at: booking.checkedOutDate,
      expected_return_at: booking.expectedReturnAt,
      returned_at: booking.returnedDate,
      notes: booking.notes || null,
      status: booking.status,
    })
    .eq("id", booking.id);

  if (bookingError) {
    throw new Error(bookingError.message);
  }

  const itemResults = await Promise.all(
    booking.items.map((item) =>
      supabase
        .from("booking_items")
        .update({ collected_at: item.collectedAt })
        .eq("id", item.id),
    ),
  );
  const itemError = itemResults.find((result) => result.error)?.error;

  if (itemError) {
    throw new Error(itemError.message);
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", booking.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapBookingRow(data as unknown as BookingRow);
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
