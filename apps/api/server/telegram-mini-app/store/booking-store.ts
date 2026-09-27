import { getSupabaseAdmin } from "../../supabase-admin.js"

export type BookingItemRecord = { id: string; equipmentId: string; name: string; serialNumber: string; category: string }

export type BookingRecord = {
  id: string
  workspaceId: string
  title: string
  trackingCode: string
  status: string
  bookedBy: string
  checkedOutAt: string
  expectedReturnAt: string
  returnedAt: string | null
  notes: string | null
  items: BookingItemRecord[]
}

type BookingRow = {
  id: string
  workspace_id: string
  title: string
  tracking_code: string
  status: string
  booked_by: string
  checked_out_at: string
  expected_return_at: string
  returned_at: string | null
  notes: string | null
}

type BookingItemRow = {
  id: string
  equipment_id: string
  equipment: { name: string; serial_number: string; category: string } | null
}

async function loadBookingItems(bookingId: string): Promise<BookingItemRecord[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("booking_items")
    .select("id, equipment_id, equipment:equipment_id ( name, serial_number, category )")
    .eq("booking_id", bookingId)
  if (error) throw new Error("Could not load the booking's equipment")

  return ((data ?? []) as unknown as BookingItemRow[]).map((row) => ({
    id: row.id,
    equipmentId: row.equipment_id,
    name: row.equipment?.name ?? "",
    serialNumber: row.equipment?.serial_number ?? "",
    category: row.equipment?.category ?? "",
  }))
}

export async function loadBooking(id: string): Promise<BookingRecord | null> {
  const bookingResult = await getSupabaseAdmin()
    .from("bookings")
    .select("id, workspace_id, title, tracking_code, status, booked_by, checked_out_at, expected_return_at, returned_at, notes")
    .eq("id", id)
    .maybeSingle()
  if (bookingResult.error) throw new Error("Could not load the booking")
  if (!bookingResult.data) return null

  const row = bookingResult.data as BookingRow
  const items = await loadBookingItems(id)

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    trackingCode: row.tracking_code,
    status: row.status,
    bookedBy: row.booked_by,
    checkedOutAt: row.checked_out_at,
    expectedReturnAt: row.expected_return_at,
    returnedAt: row.returned_at,
    notes: row.notes,
    items,
  }
}
