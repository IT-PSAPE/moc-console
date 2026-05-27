import type { Booking, BookingItem } from "@moc/types/equipment/booking";
import { supabase } from "@moc/data/supabase";

const BOOKING_SELECT = `
  id,
  tracking_code,
  title,
  booked_by,
  checked_out_at,
  expected_return_at,
  returned_at,
  notes,
  status,
  created_at,
  items:booking_items(
    id,
    equipment_id,
    equipment:equipment_id(id, name, category, thumbnail_url)
  )
`;

type BookingItemRow = {
  id: string;
  equipment_id: string;
  equipment:
    | {
        id: string;
        name: string;
        category: BookingItem["equipmentCategory"];
        thumbnail_url: string | null;
      }
    | null;
};

type BookingRow = {
  id: string;
  tracking_code: string;
  title: string;
  booked_by: string;
  checked_out_at: string;
  expected_return_at: string;
  returned_at: string | null;
  notes: string | null;
  status: Booking["status"];
  created_at: string;
  items: BookingItemRow[] | null;
};

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

function mapBookingItem(item: BookingItemRow): BookingItem {
  return {
    id: item.id,
    equipmentId: item.equipment_id,
    equipmentName: item.equipment?.name ?? "Unknown equipment",
    equipmentCategory: item.equipment?.category ?? ("other" as BookingItem["equipmentCategory"]),
    equipmentThumbnail: item.equipment?.thumbnail_url ?? null,
  };
}

function mapBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    title: row.title,
    bookedBy: row.booked_by,
    checkedOutDate: row.checked_out_at,
    expectedReturnAt: row.expected_return_at,
    returnedDate: row.returned_at,
    duration: getBookingDuration(row.checked_out_at, row.returned_at, row.expected_return_at),
    notes: row.notes ?? "",
    status: row.status,
    createdAt: row.created_at,
    items: (row.items ?? []).map(mapBookingItem),
  };
}

// Title is intentionally not in the update payload — bookings are owned by the
// requester via MOC Request; the console can amend lifecycle/dates/notes but
// not relabel the submission.
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
    .select(BOOKING_SELECT)
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
