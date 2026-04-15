import type { Booking } from "@/types/equipment/booking";
import { supabase } from "@/lib/supabase";

export async function updateBooking(booking: Booking): Promise<Booking> {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      booked_by: booking.bookedBy,
      checked_out_at: booking.checkedOutDate,
      expected_return_at: booking.expectedReturnAt,
      returned_at: booking.returnedDate,
      notes: booking.notes || null,
      status: booking.status,
    })
    .eq("id", booking.id)
    .select("id, equipment_id, booked_by, checked_out_at, expected_return_at, returned_at, notes, status, equipment:equipment_id(id, name)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as Record<string, unknown>;
  const equipment = Array.isArray(row.equipment) ? row.equipment[0] : row.equipment;

  return {
    id: row.id as string,
    equipmentId: row.equipment_id as string,
    equipmentName: (equipment as { name: string })?.name ?? booking.equipmentName,
    bookedBy: row.booked_by as string,
    checkedOutDate: row.checked_out_at as string,
    expectedReturnAt: row.expected_return_at as string,
    returnedDate: (row.returned_at as string | null),
    duration: booking.duration,
    notes: (row.notes as string) ?? "",
    status: row.status as Booking["status"],
  };
}
