import type { PlatformContext } from "./context.js"
import { objectInput, optionalUuidField, PlatformInputError, uuidField } from "./input.js"

type RequestLinkedTable = "checklists" | "bookings" | "venue_bookings" | "streams" | "zoom_meetings"

/** Changes only the relationship; lifecycle and provider fields stay untouched. */
export async function setRecordRequest(context: PlatformContext, table: RequestLinkedTable, input: unknown): Promise<void> {
  const record = objectInput(input, ["id", "requestId"])
  const id = uuidField(record, "id")
  if (!("requestId" in record) || record.requestId === undefined) throw new PlatformInputError("Specify requestId or null to unlink")
  const requestId = optionalUuidField(record, "requestId") ?? null
  await validateRequestLink(context, requestId)
  // table is a server-owned allowlist, never user-supplied SQL.
  const result = await context.db.query(
    `UPDATE public.${table} SET request_id=$3 WHERE workspace_id=$1 AND id=$2`,
    [context.workspaceId, id, requestId],
  )
  if (result.rowCount === 0) {
    throw Object.assign(new Error("Record not found in this workspace"), { status: 404, code: "not_found" })
  }
}

export async function validateRequestLink(context: PlatformContext, requestId: string | null): Promise<void> {
  if (requestId === null) return
  // Foreign keys acquire the reference lock on write. A row-locking SELECT
  // would require update permission on requests and exclude create-only roles.
  const request = await context.db.query<{ id: string }>(
    "SELECT id FROM public.requests WHERE workspace_id=$1 AND id=$2",
    [context.workspaceId, requestId],
  )
  if (!request.rows[0]) throw new PlatformInputError("Request not found in this workspace")
}
