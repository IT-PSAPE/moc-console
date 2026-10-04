import type { Equipment } from "@moc/types/equipment/equipment"
import type { PlatformContext, PlatformOperation } from "./context.js"
import { objectInput, PlatformInputError, stringField, uuidField } from "./input.js"

type EquipmentRow = {
  id: string
  name: string
  serial_number: string
  category: Equipment["category"]
  status: Equipment["status"]
  location: string
  notes: string | null
  last_active_on: string | null
  thumbnail_url: string | null
  booked_by: string | null
  checked_out_at: string | null
}

const equipmentFields = ["id", "name", "serialNumber", "category", "status", "location", "notes", "lastActiveDate", "thumbnail"] as const
const categories: readonly Equipment["category"][] = ["camera", "lens", "lighting", "audio", "support", "monitor", "cable", "accessory"]
const statuses: readonly Equipment["status"][] = ["available", "booked", "booked_out", "maintenance"]
const SELECT = `id, name, serial_number, category, status, location, notes, last_active_on::text AS last_active_on,
  thumbnail_url,
  (SELECT b.booked_by FROM public.bookings b JOIN public.booking_items bi ON bi.booking_id = b.id
   WHERE bi.equipment_id = e.id AND b.workspace_id = e.workspace_id AND b.status <> 'returned'
   ORDER BY b.checked_out_at DESC LIMIT 1) AS booked_by,
  (SELECT b.checked_out_at::text FROM public.bookings b JOIN public.booking_items bi ON bi.booking_id = b.id
   WHERE bi.equipment_id = e.id AND b.workspace_id = e.workspace_id AND b.status <> 'returned'
   ORDER BY b.checked_out_at DESC LIMIT 1) AS checked_out_at`

function mapEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    name: row.name,
    serialNumber: row.serial_number,
    category: row.category,
    status: row.status,
    location: row.location,
    notes: row.notes ?? "",
    lastActiveDate: row.last_active_on ?? row.checked_out_at ?? new Date().toISOString(),
    bookedBy: row.booked_by,
    thumbnail: row.thumbnail_url,
  }
}

function readEquipment(input: unknown): Equipment {
  const record = objectInput(input, equipmentFields)
  const category = stringField(record, "category") as Equipment["category"]
  const status = stringField(record, "status") as Equipment["status"]
  if (!categories.includes(category) || !statuses.includes(status)) throw new PlatformInputError("Invalid equipment category or status")
  const nullableString = (key: string): string | null => {
    const value = record[key]
    if (value === null || value === undefined) return null
    if (typeof value !== "string") throw new PlatformInputError(`Invalid ${key}`)
    return value
  }
  return {
    id: uuidField(record, "id"),
    name: stringField(record, "name"),
    serialNumber: stringField(record, "serialNumber"),
    category,
    status,
    location: stringField(record, "location"),
    notes: nullableString("notes") ?? "",
    lastActiveDate: nullableString("lastActiveDate") ?? new Date().toISOString(),
    bookedBy: null,
    thumbnail: nullableString("thumbnail"),
  }
}

function notFound(): Error {
  const error = new Error("Equipment not found") as Error & { status: number; code: string }
  error.status = 404
  error.code = "not_found"
  return error
}

async function findEquipment(context: PlatformContext, id: string): Promise<Equipment | undefined> {
  const result = await context.db.query<EquipmentRow>(
    `SELECT ${SELECT} FROM public.equipment e WHERE e.workspace_id = $1 AND e.id = $2`,
    [context.workspaceId, id],
  )
  return result.rows[0] ? mapEquipment(result.rows[0]) : undefined
}

export const operations: Record<string, PlatformOperation> = {
  list: {
    permission: "can_read",
    async run(context) {
      const result = await context.db.query<EquipmentRow>(
        `SELECT ${SELECT} FROM public.equipment e WHERE e.workspace_id = $1 ORDER BY e.name ASC`,
        [context.workspaceId],
      )
      return result.rows.map(mapEquipment)
    },
  },
  getById: {
    permission: "can_read",
    async run(context, input) {
      const { id } = objectInput(input, ["id"])
      const equipment = await findEquipment(context, uuidField({ id }, "id"))
      return equipment ?? null
    },
  },
  create: {
    permission: "can_create",
    async run(context, input) {
      const { equipment: source } = objectInput(input, ["equipment"])
      const equipment = readEquipment(source)
      await context.db.query(
        `INSERT INTO public.equipment (id, workspace_id, name, serial_number, category, status, location, notes, last_active_on, thumbnail_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10)`,
        [equipment.id, context.workspaceId, equipment.name, equipment.serialNumber, equipment.category, equipment.status, equipment.location, equipment.notes || null, equipment.lastActiveDate.slice(0, 10), equipment.thumbnail],
      )
      const created = await findEquipment(context, equipment.id)
      if (!created) throw notFound()
      return created
    },
  },
  update: {
    permission: "can_update",
    async run(context, input) {
      const { equipment: source } = objectInput(input, ["equipment"])
      const equipment = readEquipment(source)
      const result = await context.db.query<EquipmentRow>(
        `UPDATE public.equipment SET name=$3, serial_number=$4, category=$5, status=$6, location=$7, notes=$8, last_active_on=$9::date, thumbnail_url=$10
         WHERE workspace_id=$1 AND id=$2`,
        [context.workspaceId, equipment.id, equipment.name, equipment.serialNumber, equipment.category, equipment.status, equipment.location, equipment.notes || null, equipment.lastActiveDate.slice(0, 10), equipment.thumbnail],
      )
      if (result.rowCount === 0) throw notFound()
      const updated = await findEquipment(context, equipment.id)
      if (!updated) throw notFound()
      return updated
    },
  },
  updateStatus: {
    permission: "can_update",
    async run(context, input) {
      const record = objectInput(input, ["id", "status"])
      const status = stringField(record, "status") as Equipment["status"]
      if (!statuses.includes(status)) throw new PlatformInputError("Invalid equipment status")
      const result = await context.db.query("UPDATE public.equipment SET status=$3 WHERE workspace_id=$1 AND id=$2", [context.workspaceId, uuidField(record, "id"), status])
      if (result.rowCount === 0) throw notFound()
      return null
    },
  },
  delete: {
    permission: "can_delete",
    async run(context, input) {
      const { id } = objectInput(input, ["id"])
      const result = await context.db.query("DELETE FROM public.equipment WHERE workspace_id=$1 AND id=$2", [context.workspaceId, uuidField({ id }, "id")])
      if (result.rowCount === 0) throw notFound()
      return null
    },
  },
}
