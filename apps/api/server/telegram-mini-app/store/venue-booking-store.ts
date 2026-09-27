import { getSupabaseAdmin } from "../../supabase-admin.js"

export type VenueRecurrence = {
  custom: boolean
  frequency: "day" | "week" | "month"
  interval: number
  weekdays: number[]
  end: { type: "year_end" } | { type: "date"; date: string } | { type: "count"; count: number } | null
}

export type VenueOccurrence = { index: number; startsAt: string; endsAt: string }

export type VenueBookingRecord = {
  id: string
  workspaceId: string
  title: string
  trackingCode: string
  status: string
  venueName: string
  eventName: string | null
  eventOther: string | null
  startsAt: string
  endsAt: string
  notes: string | null
  recurrence: VenueRecurrence | null
  occurrences: VenueOccurrence[]
}

type VenueBookingRow = {
  id: string
  workspace_id: string
  title: string
  tracking_code: string
  status: string
  starts_at: string
  ends_at: string
  notes: string | null
  recurrence: VenueRecurrence | null
  event_other: string | null
  venue: { name: string } | null
  event: { name: string } | null
}

type SlotRow = { occurrence_index: number; slot_start: string; slot_end: string }

function groupOccurrences(slots: SlotRow[]): VenueOccurrence[] {
  const byIndex = new Map<number, { start: string; end: string }>()
  for (const slot of slots) {
    const existing = byIndex.get(slot.occurrence_index)
    if (!existing) {
      byIndex.set(slot.occurrence_index, { start: slot.slot_start, end: slot.slot_end })
      continue
    }
    if (slot.slot_start < existing.start) existing.start = slot.slot_start
    if (slot.slot_end > existing.end) existing.end = slot.slot_end
  }
  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, span]) => ({ index, startsAt: span.start, endsAt: span.end }))
}

export async function loadVenueBooking(id: string): Promise<VenueBookingRecord | null> {
  const admin = getSupabaseAdmin()

  const bookingResult = await admin
    .from("venue_bookings")
    .select("id, workspace_id, title, tracking_code, status, starts_at, ends_at, notes, recurrence, event_other, venue:venue_id ( name ), event:event_id ( name )")
    .eq("id", id)
    .maybeSingle()
  if (bookingResult.error) throw new Error("Could not load the venue booking")
  if (!bookingResult.data) return null

  const row = bookingResult.data as unknown as VenueBookingRow

  const slotsResult = await admin
    .from("venue_booking_slots")
    .select("occurrence_index, slot_start, slot_end")
    .eq("venue_booking_id", id)
  if (slotsResult.error) throw new Error("Could not load the venue booking's slots")

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    trackingCode: row.tracking_code,
    status: row.status,
    venueName: row.venue?.name ?? "",
    eventName: row.event?.name ?? null,
    eventOther: row.event_other,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    notes: row.notes,
    recurrence: row.recurrence,
    occurrences: groupOccurrences((slotsResult.data ?? []) as SlotRow[]),
  }
}
