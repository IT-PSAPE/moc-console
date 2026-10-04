import type { VenueBooking, VenueBookingStatus } from "@moc/types/venues"
import type { VenueRecurrence } from "@moc/types/venues/recurrence"
import type { PlatformContext, PlatformOperation } from "./context.js"
import { objectInput, stringField, uuidField } from "./input.js"

type SlotRow = { occurrence_index: number; slot_start: string; slot_end: string }
type VenueBookingRow = {
  id: string
  workspace_id: string
  venue_id: string
  event_id: string | null
  event_other: string | null
  tracking_code: string
  title: string
  requested_by: string
  notes: string | null
  status: VenueBookingStatus
  starts_at: string
  ends_at: string
  recurrence: VenueRecurrence | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  created_at: string
  updated_at: string
  venue_name: string | null
  venue_description: string | null
  event_name: string | null
  canceller_name: string | null
  approver_name: string | null
  rejecter_name: string | null
  slots: SlotRow[] | null
}

const SELECT = `b.id, b.workspace_id, b.venue_id, b.event_id, b.event_other, b.tracking_code, b.title, b.requested_by, b.notes,
  b.status, b.starts_at::text, b.ends_at::text, b.recurrence, b.cancelled_at::text, b.cancelled_by, b.cancel_reason,
  b.approved_at::text, b.approved_by, b.rejected_at::text, b.rejected_by, b.created_at::text, b.updated_at::text,
  v.name AS venue_name, v.description AS venue_description, e.name AS event_name,
  concat_ws(' ', cancel_user.name, cancel_user.surname) AS canceller_name,
  concat_ws(' ', approve_user.name, approve_user.surname) AS approver_name,
  concat_ws(' ', reject_user.name, reject_user.surname) AS rejecter_name,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('occurrence_index', s.occurrence_index, 'slot_start', s.slot_start::text, 'slot_end', s.slot_end::text) ORDER BY s.occurrence_index, s.slot_start)
    FROM public.venue_booking_slots s WHERE s.venue_booking_id=b.id), '[]'::jsonb) AS slots
  FROM public.venue_bookings b
  LEFT JOIN public.venues v ON v.id=b.venue_id AND v.workspace_id=b.workspace_id
  LEFT JOIN public.venue_events e ON e.id=b.event_id AND e.workspace_id=b.workspace_id
  LEFT JOIN public.users cancel_user ON cancel_user.id=b.cancelled_by
  LEFT JOIN public.users approve_user ON approve_user.id=b.approved_by
  LEFT JOIN public.users reject_user ON reject_user.id=b.rejected_by`

function occurrences(slots: SlotRow[]): VenueBooking["occurrences"] {
  const grouped = new Map<number, VenueBooking["occurrences"][number]>()
  for (const slot of slots) {
    const prior = grouped.get(slot.occurrence_index)
    grouped.set(slot.occurrence_index, {
      index: slot.occurrence_index,
      startsAt: !prior || slot.slot_start < prior.startsAt ? slot.slot_start : prior.startsAt,
      endsAt: !prior || slot.slot_end > prior.endsAt ? slot.slot_end : prior.endsAt,
    })
  }
  return [...grouped.values()].sort((left, right) => left.index - right.index)
}

function personName(value: string | null, fallback: string | null): string | null {
  const name = value?.trim()
  return name || fallback
}

function mapBooking(row: VenueBookingRow): VenueBooking {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    venueId: row.venue_id,
    venueName: row.venue_name ?? "Unknown venue",
    venueDescription: row.venue_description,
    eventId: row.event_id,
    eventName: row.event_name,
    eventOther: row.event_other,
    trackingCode: row.tracking_code,
    title: row.title,
    requestedBy: row.requested_by,
    notes: row.notes,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    recurrence: row.recurrence,
    occurrences: occurrences(row.slots ?? []),
    cancelledAt: row.cancelled_at,
    cancelledBy: personName(row.canceller_name, row.cancelled_by),
    cancelReason: row.cancel_reason,
    approvedAt: row.approved_at,
    approvedBy: personName(row.approver_name, row.approved_by),
    rejectedAt: row.rejected_at,
    rejectedBy: personName(row.rejecter_name, row.rejected_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function notFound(): Error {
  const error = new Error("Venue booking not found") as Error & { status: number; code: string }
  error.status = 404
  error.code = "not_found"
  return error
}

function conflict(message = "Those times have since been booked by someone else."): Error {
  const error = new Error(message) as Error & { status: number; code: string }
  error.status = 409
  error.code = "conflict"
  return error
}

async function getBooking(context: PlatformContext, id: string): Promise<VenueBooking | null> {
  const result = await context.db.query<VenueBookingRow>(`SELECT ${SELECT} WHERE b.workspace_id=$1 AND b.id=$2`, [context.workspaceId, id])
  return result.rows[0] ? mapBooking(result.rows[0]) : null
}

async function transition(context: PlatformContext, id: string, operation: "cancel" | "restore" | "approve" | "reject", reason?: string): Promise<VenueBooking> {
  const values: Record<string, unknown> = {
    cancel: { status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: context.userId, cancel_reason: reason?.trim() ?? "", approved_at: null, approved_by: null, where: ["auto", "approved"] },
    restore: { status: "auto", cancelled_at: null, cancelled_by: null, cancel_reason: null, approved_at: null, approved_by: null, rejected_at: null, rejected_by: null, where: ["cancelled", "rejected"] },
    approve: { status: "approved", approved_at: new Date().toISOString(), approved_by: context.userId, rejected_at: null, rejected_by: null, where: ["auto"] },
    reject: { status: "rejected", rejected_at: new Date().toISOString(), rejected_by: context.userId, approved_at: null, approved_by: null, where: ["auto", "approved"] },
  }[operation]
  const result = await context.db.query(
    `UPDATE public.venue_bookings SET status=$3, cancelled_at=$4, cancelled_by=$5, cancel_reason=$6,
       approved_at=$7, approved_by=$8, rejected_at=$9, rejected_by=$10
     WHERE workspace_id=$1 AND id=$2 AND status = ANY($11::public.venue_booking_status[])`,
    [context.workspaceId, id, values.status, values.cancelled_at ?? null, values.cancelled_by ?? null, values.cancel_reason ?? null,
      values.approved_at ?? null, values.approved_by ?? null, values.rejected_at ?? null, values.rejected_by ?? null, values.where],
  ).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") throw conflict()
    throw error
  })
  if (result.rowCount === 0) {
    if (!(await getBooking(context, id))) throw notFound()
    throw conflict("This venue booking can no longer be changed from its current status.")
  }
  const booking = await getBooking(context, id)
  if (!booking) throw notFound()
  return booking
}

export const operations: Record<string, PlatformOperation> = {
  list: {
    permission: "can_read",
    async run(context) {
      const result = await context.db.query<VenueBookingRow>(`SELECT ${SELECT} WHERE b.workspace_id=$1 ORDER BY b.starts_at DESC`, [context.workspaceId])
      return result.rows.map(mapBooking)
    },
  },
  getById: {
    permission: "can_read",
    async run(context, input) {
      const { id } = objectInput(input, ["id"])
      return await getBooking(context, uuidField({ id }, "id"))
    },
  },
  cancel: {
    permission: "can_update",
    async run(context, input) {
      const record = objectInput(input, ["id", "reason"])
      return transition(context, uuidField(record, "id"), "cancel", stringField(record, "reason"))
    },
  },
  restore: {
    permission: "can_update",
    async run(context, input) {
      const { id } = objectInput(input, ["id"])
      return transition(context, uuidField({ id }, "id"), "restore")
    },
  },
  approve: {
    permission: "can_update",
    async run(context, input) {
      const { id } = objectInput(input, ["id"])
      return transition(context, uuidField({ id }, "id"), "approve")
    },
  },
  reject: {
    permission: "can_update",
    async run(context, input) {
      const { id } = objectInput(input, ["id"])
      return transition(context, uuidField({ id }, "id"), "reject")
    },
  },
}
