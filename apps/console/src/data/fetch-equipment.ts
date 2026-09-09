import type { Equipment } from "@moc/types/equipment/equipment";
import type { Booking } from "@moc/types/equipment/booking";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { BOOKING_SELECT, type BookingRow, mapBookingRow } from "./booking-row";

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

export async function fetchEquipment(workspaceId?: string): Promise<Equipment[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const [equipmentResult, bookingResult] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, name, serial_number, category, status, location, notes, last_active_on, thumbnail_url")
      .eq("workspace_id", resolvedWorkspaceId)
      .order("name", { ascending: true }),
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("workspace_id", resolvedWorkspaceId)
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

export async function fetchEquipmentById(id: string, workspaceId?: string): Promise<Equipment | undefined> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const [equipmentResult, bookingResult] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, name, serial_number, category, status, location, notes, last_active_on, thumbnail_url")
      .eq("workspace_id", resolvedWorkspaceId)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("checked_out_at, booked_by, items:booking_items!inner(equipment_id)")
      .eq("workspace_id", resolvedWorkspaceId)
      .eq("items.equipment_id", id)
      .neq("status", "returned")
      .order("checked_out_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (equipmentResult.error) {
    throw new Error(equipmentResult.error.message);
  }

  if (bookingResult.error) {
    throw new Error(bookingResult.error.message);
  }

  if (!equipmentResult.data) {
    return undefined;
  }

  const activeBookingByEquipmentId = new Map<string, ActiveBookingForEquipment>();

  if (bookingResult.data) {
    activeBookingByEquipmentId.set(id, {
      checkedOutAt: bookingResult.data.checked_out_at,
      bookedBy: bookingResult.data.booked_by,
    });
  }

  return mapEquipmentRow(equipmentResult.data as EquipmentRow, activeBookingByEquipmentId);
}

export async function fetchBookings(workspaceId?: string): Promise<Booking[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("workspace_id", resolvedWorkspaceId)
    .order("checked_out_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as BookingRow[]).map(mapBookingRow);
}

export async function fetchBookingById(id: string, workspaceId?: string): Promise<Booking | undefined> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("workspace_id", resolvedWorkspaceId)
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
