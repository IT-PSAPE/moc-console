// Pure formatting: turns store records into the MiniAppDetail shapes the
// Mini App renders as-is. No Supabase, no network — unit-testable in
// isolation from the ops that load the data.

import { formatInstant, type DateFormatPreset, type MiniAppAction, type MiniAppChecklistDetail, type MiniAppChecklistItem, type MiniAppEntityDetail, type MiniAppField } from "@moc/notifications"
import type { BookingRecord } from "./store/booking-store.js"
import type { ChecklistRecord } from "./store/checklist-store.js"
import type { RequestRecord } from "./store/request-store.js"
import type { VenueBookingRecord, VenueRecurrence } from "./store/venue-booking-store.js"
import { bookingStatusColor, bookingStatusLabel, equipmentCategoryLabel, requestStatusColor, requestStatusLabel, titleCase, venuePhaseColor } from "./status-labels.js"
import { venueBookingPhaseLabel } from "../notifications/dispatch-tokens.js"

export type FormatSettings = { timezone: string; dateFormat: DateFormatPreset }

function date(iso: string, format: FormatSettings): string {
  return formatInstant(iso, format.timezone, format.dateFormat) || iso
}

// ─── Request ───────────────────────────────────────────

export function buildRequestDetail(
  request: RequestRecord,
  categoryName: string,
  format: FormatSettings,
  actions: MiniAppAction[],
): MiniAppEntityDetail {
  const fields: MiniAppField[] = [
    { label: "Who", value: request.who },
    { label: "What", value: request.what },
    { label: "When", value: request.whenText },
    { label: "Where", value: request.whereText },
    { label: "Why", value: request.why },
    { label: "How", value: request.how },
    { label: "Category", value: categoryName },
    { label: "Priority", value: titleCase(request.priority) },
    { label: "Due", value: date(request.dueDate, format) },
  ]

  return {
    kind: "request",
    id: request.id,
    title: request.title,
    trackingCode: request.trackingCode,
    status: { value: request.status, label: requestStatusLabel(request.status), color: requestStatusColor(request.status) },
    fields,
    notes: request.notes,
    actions,
    equipment: [],
    scanMode: null,
  }
}

// ─── Booking ───────────────────────────────────────────

export function buildBookingDetail(
  booking: BookingRecord,
  format: FormatSettings,
  actions: MiniAppAction[],
  canUpdate: boolean,
): MiniAppEntityDetail {
  const fields: MiniAppField[] = [
    { label: "Requester", value: booking.bookedBy },
    { label: "Checked out", value: date(booking.checkedOutAt, format) },
    { label: "Expected return", value: date(booking.expectedReturnAt, format) },
  ]
  if (booking.returnedAt) fields.push({ label: "Returned", value: date(booking.returnedAt, format) })
  fields.push({ label: "Items", value: String(booking.items.length) })

  const scanMode = !canUpdate
    ? null
    : booking.status === "booked"
      ? "check_out"
      : booking.status === "checked_out"
        ? "return"
        : null

  return {
    kind: "booking",
    id: booking.id,
    title: booking.title,
    trackingCode: booking.trackingCode,
    status: { value: booking.status, label: bookingStatusLabel(booking.status), color: bookingStatusColor(booking.status) },
    fields,
    notes: booking.notes,
    actions,
    equipment: booking.items.map((item) => ({
      id: item.id,
      equipmentId: item.equipmentId,
      name: item.name,
      serialNumber: item.serialNumber,
      category: equipmentCategoryLabel(item.category),
    })),
    scanMode,
  }
}

// ─── Venue booking ─────────────────────────────────────

const FREQUENCY_LABEL: Record<VenueRecurrence["frequency"], { singular: string; plural: string }> = {
  day: { singular: "day", plural: "days" },
  week: { singular: "week", plural: "weeks" },
  month: { singular: "month", plural: "months" },
}

// Mirrors packages/types/src/venues/recurrence.ts#formatVenueRecurrenceLabel
// (kept local for the same runtime-import reason as status-labels.ts).
function repeatPatternLabel(recurrence: VenueRecurrence | null): string {
  if (!recurrence) return "Does not repeat"
  if (recurrence.frequency === "week" && recurrence.interval === 1 && recurrence.weekdays.join(",") === "1,2,3,4,5") {
    return "Every weekday"
  }
  const unit = FREQUENCY_LABEL[recurrence.frequency]
  return recurrence.interval === 1 ? `Every ${unit.singular}` : `Every ${recurrence.interval} ${unit.plural}`
}

function occurrencesSummary(record: VenueBookingRecord, format: FormatSettings): string | null {
  if (record.occurrences.length <= 1) return null
  const first = record.occurrences[0]
  const last = record.occurrences[record.occurrences.length - 1]
  return `${record.occurrences.length} occurrences, ${date(first.startsAt, format)} – ${date(last.endsAt, format)}`
}

export function buildVenueBookingDetail(
  record: VenueBookingRecord,
  phase: string,
  format: FormatSettings,
  actions: MiniAppAction[],
): MiniAppEntityDetail {
  const fields: MiniAppField[] = [
    { label: "Venue", value: record.venueName },
    { label: "Event", value: record.eventName ?? record.eventOther ?? "" },
    { label: "When", value: `${date(record.startsAt, format)} – ${date(record.endsAt, format)}` },
    { label: "Repeat", value: repeatPatternLabel(record.recurrence) },
  ]
  const occurrences = occurrencesSummary(record, format)
  if (occurrences) fields.push({ label: "Occurrences", value: occurrences })

  return {
    kind: "venue_booking",
    id: record.id,
    title: record.title,
    trackingCode: record.trackingCode,
    status: { value: phase, label: venueBookingPhaseLabel[phase] ?? titleCase(phase), color: venuePhaseColor(phase) },
    fields,
    notes: record.notes,
    actions,
    equipment: [],
    scanMode: null,
  }
}

// ─── Checklist ─────────────────────────────────────────

// Ticking follows the console's rule: only members with update permission.
function toChecklistItem(item: ChecklistRecord["items"][number], canUpdate: boolean): MiniAppChecklistItem {
  return { id: item.id, label: item.label, checked: item.checked, canToggle: canUpdate, assigneeNames: item.assigneeNames }
}

export function buildChecklistDetail(checklist: ChecklistRecord, canUpdate: boolean): MiniAppChecklistDetail {
  const sortedSections = [...checklist.sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const sortedItems = [...checklist.items].sort((a, b) => a.sortOrder - b.sortOrder)

  const sections: MiniAppChecklistDetail["sections"] = sortedSections.map((section) => ({
    id: section.id,
    name: section.name,
    items: sortedItems.filter((item) => item.sectionId === section.id).map((item) => toChecklistItem(item, canUpdate)),
  }))

  const sectionless = sortedItems.filter((item) => item.sectionId === null)
  if (sectionless.length > 0) {
    sections.push({ id: null, name: "General", items: sectionless.map((item) => toChecklistItem(item, canUpdate)) })
  }

  return {
    kind: "checklist",
    id: checklist.id,
    name: checklist.name,
    description: checklist.description,
    scheduledAt: checklist.scheduledAt,
    sections,
  }
}
