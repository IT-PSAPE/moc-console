import type { Booking, BookingItem, BookingStatus } from "@moc/types/equipment/booking"
import type { EquipmentCategory } from "@moc/types/equipment/category"
import type { PlatformOperation } from "./context.js"
import { objectInput, PlatformInputError, stringField, uuidField } from "./input.js"

type BookingRow = {
  id: string
  tracking_code: string
  title: string
  booked_by: string
  checked_out_at: string
  expected_return_at: string
  returned_at: string | null
  notes: string | null
  status: BookingStatus
  created_at: string
  items: Array<{ id: string; equipment_id: string; name: string | null; category: EquipmentCategory | null; thumbnail_url: string | null }> | null
}

const statuses: readonly BookingStatus[] = ["booked", "checked_out", "returned", "archived"]
const SELECT = `b.id, b.tracking_code, b.title, b.booked_by, b.checked_out_at::text, b.expected_return_at::text, b.returned_at::text,
  b.notes, b.status, b.created_at::text,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id', bi.id, 'equipment_id', bi.equipment_id, 'name', e.name, 'category', e.category, 'thumbnail_url', e.thumbnail_url) ORDER BY e.name)
    FROM public.booking_items bi JOIN public.equipment e ON e.id=bi.equipment_id
    WHERE bi.booking_id=b.id AND e.workspace_id=b.workspace_id), '[]'::jsonb) AS items`

function duration(row: BookingRow): string {
  const start = new Date(row.checked_out_at).getTime()
  const end = new Date(row.returned_at ?? row.expected_return_at).getTime()
  const hours = Math.round(Math.max(end - start, 0) / 3_600_000)
  if (hours >= 24) {
    const days = Math.round(hours / 24)
    return `${days} ${days === 1 ? "day" : "days"}`
  }
  const count = Math.max(hours, 1)
  return `${count} ${count === 1 ? "hour" : "hours"}`
}

function mapBooking(row: BookingRow): Booking {
  const items: BookingItem[] = (row.items ?? []).map((item) => ({
    id: item.id,
    equipmentId: item.equipment_id,
    equipmentName: item.name ?? "Unknown equipment",
    equipmentCategory: item.category ?? "accessory",
    equipmentThumbnail: item.thumbnail_url,
  }))
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    title: row.title,
    bookedBy: row.booked_by,
    checkedOutDate: row.checked_out_at,
    expectedReturnAt: row.expected_return_at,
    returnedDate: row.returned_at,
    duration: duration(row),
    notes: row.notes ?? "",
    status: row.status,
    createdAt: row.created_at,
    items,
  }
}

async function getBooking(context: Parameters<PlatformOperation["run"]>[0], id: string): Promise<Booking | null> {
  const result = await context.db.query<BookingRow>(`SELECT ${SELECT} FROM public.bookings b WHERE b.workspace_id=$1 AND b.id=$2`, [context.workspaceId, id])
  return result.rows[0] ? mapBooking(result.rows[0]) : null
}

function notFound(): Error {
  const error = new Error("Booking not found") as Error & { status: number; code: string }
  error.status = 404
  error.code = "not_found"
  return error
}

export const operations: Record<string, PlatformOperation> = {
  list: {
    permission: "can_read",
    async run(context) {
      const result = await context.db.query<BookingRow>(`SELECT ${SELECT} FROM public.bookings b WHERE b.workspace_id=$1 ORDER BY b.checked_out_at DESC`, [context.workspaceId])
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
  listByEquipmentId: {
    permission: "can_read",
    async run(context, input) {
      const { equipmentId } = objectInput(input, ["equipmentId"])
      const id = uuidField({ equipmentId }, "equipmentId")
      const result = await context.db.query<BookingRow>(
        `SELECT ${SELECT} FROM public.bookings b WHERE b.workspace_id=$1 AND EXISTS (
           SELECT 1 FROM public.booking_items bi JOIN public.equipment e ON e.id=bi.equipment_id
           WHERE bi.booking_id=b.id AND bi.equipment_id=$2 AND e.workspace_id=$1)
         ORDER BY b.checked_out_at DESC`,
        [context.workspaceId, id],
      )
      return result.rows.map(mapBooking)
    },
  },
  update: {
    permission: "can_update",
    async run(context, input) {
      const { booking: source } = objectInput(input, ["booking"])
      const record = objectInput(source, ["id", "bookedBy", "checkedOutDate", "expectedReturnAt", "returnedDate", "notes", "status", "duration", "trackingCode", "title", "items", "createdAt"])
      const id = uuidField(record, "id")
      const status = stringField(record, "status") as BookingStatus
      if (!statuses.includes(status)) throw new PlatformInputError("Invalid booking status")
      const bookedBy = stringField(record, "bookedBy")
      const checkedOutAt = stringField(record, "checkedOutDate")
      const expectedReturnAt = stringField(record, "expectedReturnAt")
      const returnedAt = record.returnedDate == null ? null : stringField(record, "returnedDate")
      const notes = record.notes == null ? null : stringField(record, "notes")
      const result = await context.db.query(
        `UPDATE public.bookings SET booked_by=$3, checked_out_at=$4::timestamptz, expected_return_at=$5::timestamptz,
          returned_at=$6::timestamptz, notes=$7, status=$8 WHERE workspace_id=$1 AND id=$2`,
        [context.workspaceId, id, bookedBy, checkedOutAt, expectedReturnAt, returnedAt, notes || null, status],
      )
      if (result.rowCount === 0) throw notFound()
      const updated = await getBooking(context, id)
      if (!updated) throw notFound()
      return updated
    },
  },
  updateStatus: {
    permission: "can_update",
    async run(context, input) {
      const record = objectInput(input, ["id", "status"])
      const id = uuidField(record, "id")
      const status = stringField(record, "status") as BookingStatus
      if (!statuses.includes(status)) throw new PlatformInputError("Invalid booking status")
      const now = new Date().toISOString()
      const result = await context.db.query(
        `UPDATE public.bookings SET status=$3::public.booking_status,
           checked_out_at=CASE WHEN $3::public.booking_status='checked_out' THEN $4::timestamptz ELSE checked_out_at END,
           returned_at=CASE WHEN $3::public.booking_status='returned' THEN $4::timestamptz ELSE returned_at END
         WHERE workspace_id=$1 AND id=$2`,
        [context.workspaceId, id, status, now],
      )
      if (result.rowCount === 0) throw notFound()
      return null
    },
  },
  delete: {
    permission: "can_delete",
    async run(context, input) {
      const { id } = objectInput(input, ["id"])
      const result = await context.db.query("DELETE FROM public.bookings WHERE workspace_id=$1 AND id=$2", [context.workspaceId, uuidField({ id }, "id")])
      if (result.rowCount === 0) throw notFound()
      return null
    },
  },
}
