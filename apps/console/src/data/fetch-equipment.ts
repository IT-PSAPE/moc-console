import type { Equipment } from "@moc/types/equipment/equipment";
import type { Booking, BookingItem } from "@moc/types/equipment/booking";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

type EquipmentRow = {
  id: string;
  name: string;
  serial_number: string;
  category: Equipment["category"];
  status: Equipment["status"];
  location: string;
  notes: string | null;
  last_active_on: string | null;
  thumbnail_url: string | null;
};

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
    duration: getBookingDuration(row),
    notes: row.notes ?? "",
    status: row.status,
    createdAt: row.created_at,
    items: (row.items ?? []).map(mapBookingItem),
  };
}

type ActiveBookingForEquipment = {
  checkedOutAt: string;
  bookedBy: string;
};

function mapEquipmentRow(
  row: EquipmentRow,
  activeBookingByEquipmentId: Map<string, ActiveBookingForEquipment>,
): Equipment {
  const activeBooking = activeBookingByEquipmentId.get(row.id) ?? null;

  return {
    id: row.id,
    name: row.name,
    serialNumber: row.serial_number,
    category: row.category,
    status: row.status,
    location: row.location,
    notes: row.notes ?? "",
    lastActiveDate: row.last_active_on ?? activeBooking?.checkedOutAt ?? new Date().toISOString(),
    bookedBy: activeBooking?.bookedBy ?? null,
    thumbnail: row.thumbnail_url,
  };
}

export async function fetchEquipment(): Promise<Equipment[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const [equipmentResult, bookingResult] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, name, serial_number, category, status, location, notes, last_active_on, thumbnail_url")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true }),
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("workspace_id", workspaceId)
      .neq("status", "returned"),
  ]);

  if (equipmentResult.error) {
    throw new Error(equipmentResult.error.message);
  }

  if (bookingResult.error) {
    throw new Error(bookingResult.error.message);
  }

  const activeBookingByEquipmentId = new Map<string, ActiveBookingForEquipment>();

  for (const booking of ((bookingResult.data ?? []) as unknown as BookingRow[])) {
    for (const item of booking.items ?? []) {
      const current = activeBookingByEquipmentId.get(item.equipment_id);
      const candidate: ActiveBookingForEquipment = {
        checkedOutAt: booking.checked_out_at,
        bookedBy: booking.booked_by,
      };

      if (!current || new Date(booking.checked_out_at).getTime() > new Date(current.checkedOutAt).getTime()) {
        activeBookingByEquipmentId.set(item.equipment_id, candidate);
      }
    }
  }

  return ((equipmentResult.data ?? []) as EquipmentRow[]).map((row) => mapEquipmentRow(row, activeBookingByEquipmentId));
}

export async function fetchEquipmentById(id: string): Promise<Equipment | undefined> {
  const equipment = await fetchEquipment();
  return equipment.find((item) => item.id === id);
}

export async function fetchBookings(): Promise<Booking[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("workspace_id", workspaceId)
    .order("checked_out_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as BookingRow[]).map(mapBookingRow);
}

export async function fetchBookingById(id: string): Promise<Booking | undefined> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapBookingRow(data as unknown as BookingRow) : undefined;
}

export async function fetchBookingsByEquipmentId(equipmentId: string): Promise<Booking[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("bookings")
    .select(`
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
      items:booking_items!inner(
        id,
        equipment_id,
        equipment:equipment_id(id, name, category, thumbnail_url)
      )
    `)
    .eq("workspace_id", workspaceId)
    .eq("items.equipment_id", equipmentId)
    .order("checked_out_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as BookingRow[]).map(mapBookingRow);
}
