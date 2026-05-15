import type { Equipment } from "@moc/types/equipment/equipment";
import type { Booking } from "@moc/types/equipment/booking";
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

type BookingRow = {
  id: string;
  equipment_id: string;
  booked_by: string;
  checked_out_at: string;
  expected_return_at: string;
  returned_at: string | null;
  notes: string | null;
  status: Booking["status"];
  equipment?: {
    id: string;
    name: string;
  } | {
    id: string;
    name: string;
  }[] | null;
};

function getBookingDuration(booking: BookingRow) {
  const start = new Date(booking.checked_out_at).getTime();
  const end = new Date((booking.returned_at ?? booking.expected_return_at)).getTime();
  const diffMs = Math.max(end - start, 0);
  const totalHours = Math.round(diffMs / (1000 * 60 * 60));

  if (totalHours >= 24) {
    const days = Math.round(totalHours / 24);
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  const hours = Math.max(totalHours, 1);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function mapBookingRow(booking: BookingRow): Booking {
  const equipment = Array.isArray(booking.equipment) ? booking.equipment[0] : booking.equipment;

  return {
    id: booking.id,
    equipmentId: booking.equipment_id,
    equipmentName: equipment?.name ?? "Unknown equipment",
    bookedBy: booking.booked_by,
    checkedOutDate: booking.checked_out_at,
    expectedReturnAt: booking.expected_return_at,
    returnedDate: booking.returned_at,
    duration: getBookingDuration(booking),
    notes: booking.notes ?? "",
    status: booking.status,
  };
}

function mapEquipmentRow(row: EquipmentRow, activeBookingByEquipmentId: Map<string, BookingRow>): Equipment {
  const activeBooking = activeBookingByEquipmentId.get(row.id) ?? null;

  return {
    id: row.id,
    name: row.name,
    serialNumber: row.serial_number,
    category: row.category,
    status: row.status,
    location: row.location,
    notes: row.notes ?? "",
    lastActiveDate: row.last_active_on ?? activeBooking?.checked_out_at ?? new Date().toISOString(),
    bookedBy: activeBooking?.booked_by ?? null,
    thumbnail: row.thumbnail_url,
  };
}

function fetchWorkspaceScopedBookings(workspaceId: string, selectClause: string) {
  return supabase
    .from("bookings")
    .select(selectClause)
    .eq("workspace_id", workspaceId);
}

export async function fetchEquipment(): Promise<Equipment[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const [equipmentResult, bookingResult] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, name, serial_number, category, status, location, notes, last_active_on, thumbnail_url")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true }),
    fetchWorkspaceScopedBookings(workspaceId, "id, equipment_id, booked_by, checked_out_at, expected_return_at, returned_at, notes, status")
      .neq("status", "returned"),
  ]);

  if (equipmentResult.error) {
    throw new Error(equipmentResult.error.message);
  }

  if (bookingResult.error) {
    throw new Error(bookingResult.error.message);
  }

  const activeBookingByEquipmentId = new Map<string, BookingRow>();

  for (const booking of ((bookingResult.data ?? []) as unknown as BookingRow[])) {
    const current = activeBookingByEquipmentId.get(booking.equipment_id);

    if (!current || new Date(booking.checked_out_at).getTime() > new Date(current.checked_out_at).getTime()) {
      activeBookingByEquipmentId.set(booking.equipment_id, booking);
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
  const { data, error } = await fetchWorkspaceScopedBookings(
    workspaceId,
    "id, equipment_id, booked_by, checked_out_at, expected_return_at, returned_at, notes, status, equipment:equipment_id(id, name)",
  ).order("checked_out_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as BookingRow[]).map(mapBookingRow);
}

export async function fetchBookingsByEquipmentId(equipmentId: string): Promise<Booking[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await fetchWorkspaceScopedBookings(
    workspaceId,
    "id, equipment_id, booked_by, checked_out_at, expected_return_at, returned_at, notes, status, equipment:equipment_id(id, name)",
  )
    .eq("equipment_id", equipmentId)
    .order("checked_out_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as BookingRow[]).map(mapBookingRow);
}
