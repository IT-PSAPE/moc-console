import type { Booking, BookingItem } from "@moc/types/equipment/booking";

export const BOOKING_SELECT = `
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
    collected_at,
    equipment:equipment_id(id, name, category, thumbnail_url)
  )
`;

export type BookingItemRow = {
  id: string;
  equipment_id: string;
  collected_at: string | null;
  equipment:
    | {
        id: string;
        name: string;
        category: BookingItem["equipmentCategory"];
        thumbnail_url: string | null;
      }
    | null;
};

export type BookingRow = {
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

function getBookingDuration(row: BookingRow) {
  const start = new Date(row.checked_out_at).getTime();
  const end = new Date(row.returned_at ?? row.expected_return_at).getTime();
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
    collectedAt: item.collected_at,
  };
}

export function mapBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    title: row.title,
    bookedBy: row.booked_by,
    checkedOutDate: row.checked_out_at,
    expectedReturnAt: row.expected_return_at,
    returnedDate: row.returned_at,
    duration: getBookingDuration(row),
    notes: row.notes ?? "",
    status: row.status,
    createdAt: row.created_at,
    items: (row.items ?? []).map(mapBookingItem),
  };
}
