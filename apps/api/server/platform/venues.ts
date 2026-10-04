import type { Venue, VenueEvent } from "@moc/types/venues"
import type { PlatformOperation } from "./context.js"
import { objectInput, PlatformInputError, stringField, uuidField } from "./input.js"

type CatalogRow = {
  id: string
  workspace_id: string
  name: string
  description: string | null
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type CatalogKind = "venues" | "venue_events"
const fields = ["id", "workspace_id", "name", "description", "active", "sort_order", "created_at", "updated_at"]

function mapRow(row: CatalogRow): Venue | VenueEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function notFound(kind: string): Error {
  const error = new Error(`${kind} not found`) as Error & { status: number; code: string }
  error.status = 404
  error.code = "not_found"
  return error
}

function foreignKeyError(kind: string): Error {
  const error = new Error(`This ${kind} has bookings, so it can't be deleted. Deactivate it instead.`) as Error & { status: number; code: string }
  error.status = 409
  error.code = "conflict"
  return error
}

function catalogOperations(kind: CatalogKind): Record<string, PlatformOperation> {
  const singular = kind === "venues" ? "venue" : "event"
  return {
    list: {
      permission: "can_read",
      async run(context) {
        const result = await context.db.query<CatalogRow>(`SELECT ${fields.join(", ")} FROM public.${kind} WHERE workspace_id=$1 ORDER BY sort_order, name`, [context.workspaceId])
        return result.rows.map(mapRow)
      },
    },
    create: {
      permission: "can_create",
      async run(context, input) {
        const { draft } = objectInput(input, ["draft"])
        const values = objectInput(draft, ["name", "description"])
        const description = values.description == null ? null : stringField(values, "description")
        const result = await context.db.query<CatalogRow>(
          `INSERT INTO public.${kind} (workspace_id, name, description) VALUES ($1,$2,$3) RETURNING ${fields.join(", ")}`,
          [context.workspaceId, stringField(values, "name"), description],
        )
        return mapRow(result.rows[0])
      },
    },
    update: {
      permission: "can_update",
      async run(context, input) {
        const record = objectInput(input, ["id", "draft"])
        const values = objectInput(record.draft, ["name", "description"])
        const description = values.description == null ? null : stringField(values, "description")
        const result = await context.db.query<CatalogRow>(
          `UPDATE public.${kind} SET name=$3, description=$4 WHERE workspace_id=$1 AND id=$2 RETURNING ${fields.join(", ")}`,
          [context.workspaceId, uuidField(record, "id"), stringField(values, "name"), description],
        )
        if (!result.rows[0]) throw notFound(singular)
        return mapRow(result.rows[0])
      },
    },
    setActive: {
      permission: "can_update",
      async run(context, input) {
        const record = objectInput(input, ["id", "active"])
        if (typeof record.active !== "boolean") throw new PlatformInputError("Invalid active")
        const result = await context.db.query(`UPDATE public.${kind} SET active=$3 WHERE workspace_id=$1 AND id=$2`, [context.workspaceId, uuidField(record, "id"), record.active])
        if (result.rowCount === 0) throw notFound(singular)
        return null
      },
    },
    delete: {
      permission: "can_delete",
      async run(context, input) {
        const { id } = objectInput(input, ["id"])
        try {
          const result = await context.db.query(`DELETE FROM public.${kind} WHERE workspace_id=$1 AND id=$2`, [context.workspaceId, uuidField({ id }, "id")])
          if (result.rowCount === 0) throw notFound(singular)
        } catch (error) {
          if (error && typeof error === "object" && "code" in error && error.code === "23503") throw foreignKeyError(singular)
          throw error
        }
        return null
      },
    },
  }
}

const venueOps = catalogOperations("venues")
const eventOps = catalogOperations("venue_events")
const venuesAndEvents: Record<string, PlatformOperation> = {}
for (const [name, operation] of Object.entries(venueOps)) venuesAndEvents[name] = operation
const eventOperationNames: Record<string, string> = {
  list: "listEvents",
  create: "createEvent",
  update: "updateEvent",
  setActive: "setEventActive",
  delete: "deleteEvent",
}
for (const [name, operation] of Object.entries(eventOps)) venuesAndEvents[eventOperationNames[name]] = operation

export const operations = venuesAndEvents
