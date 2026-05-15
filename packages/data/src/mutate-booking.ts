import type { Booking } from "@/types/equipment/booking";
import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

function getBookingDuration(checkedOutAt: string, returnedAt: string | null, expectedReturnAt: string) {
  const start = new Date(checkedOutAt).getTime();
  const end = new Date(returnedAt ?? expectedReturnAt).getTime();
  const diffMs = Math.max(end - start, 0);
  const totalHours = Math.round(diffMs / (1000 * 60 * 60));

  if (totalHours >= 24) {
    const days = Math.round(totalHours / 24);
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  const hours = Math.max(totalHours, 1);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function mapBookingRow(row: Record<string, unknown>, fallbackEquipmentName: string): Booking {
  const equipment = Array.isArray(row.equipment) ? row.equipment[0] : row.equipment;

  return {
    id: row.id as string,
    equipmentId: row.equipment_id as string,
    equipmentName: (equipment as { name: string } | undefined)?.name ?? fallbackEquipmentName,
    bookedBy: row.booked_by as string,
    checkedOutDate: row.checked_out_at as string,
    expectedReturnAt: row.expected_return_at as string,
    returnedDate: row.returned_at as string | null,
    duration: getBookingDuration(
      row.checked_out_at as string,
      row.returned_at as string | null,
      row.expected_return_at as string,
    ),
    notes: (row.notes as string) ?? "",
    status: row.status as Booking["status"],
  };
}

export type CreateBookingParams = {
  equipmentId: string;
  equipmentName: string;
  bookedBy: string;
  checkedOutDate: string;
  expectedReturnAt: string;
  notes: string;
  status: Booking["status"];
};

export async function createBooking(params: CreateBookingParams): Promise<Booking> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      workspace_id: workspaceId,
      equipment_id: params.equipmentId,
      booked_by: params.bookedBy,
      checked_out_at: params.checkedOutDate,
      expected_return_at: params.expectedReturnAt,
      notes: params.notes || null,
      status: params.status,
    })
    .select("id, equipment_id, booked_by, checked_out_at, expected_return_at, returned_at, notes, status, equipment:equipment_id(id, name)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapBookingRow(data as Record<string, unknown>, params.equipmentName);
}

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

  return mapBookingRow(data as Record<string, unknown>, booking.equipmentName);
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
