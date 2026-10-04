import type { QueryResultRow } from "pg"
import { queryRows, withActor } from "@moc/backend/database"
import type { PublicSubmission, SubmissionType } from "./input.js"

export class SubmissionNotFoundError extends Error {
  constructor() { super("Submission not found"); this.name = "SubmissionNotFoundError" }
}

export class SubmissionStaleError extends Error {
  constructor() { super("Submission is stale"); this.name = "SubmissionStaleError" }
}

export class SubmissionLockedError extends Error {
  constructor() { super("Submission is locked"); this.name = "SubmissionLockedError" }
}

export class SubmissionInvalidError extends Error {
  constructor() { super("Submission details are invalid"); this.name = "SubmissionInvalidError" }
}

export class SubmissionConflictError extends Error {
  constructor() { super("Submission conflicts with an existing booking"); this.name = "SubmissionConflictError" }
}

export type UpdateSubmissionResult = { entityId: string; submission: PublicSubmission }
export type DeleteSubmissionResult = { entityId: string }

export type PublicSubmissionStore = {
  lookup: (trackingCode: string) => Promise<PublicSubmission | null>
  update: (trackingCode: string, type: SubmissionType, updatedAt: string, data: Record<string, unknown>) => Promise<UpdateSubmissionResult>
  delete: (trackingCode: string, type: SubmissionType, updatedAt: string) => Promise<DeleteSubmissionResult>
}

export type PublicSubmissionQuery = <Row extends QueryResultRow>(sql: string, values?: readonly unknown[]) => Promise<Row[]>

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function parseSubmission(value: unknown): PublicSubmission {
  const row = asRecord(value)
  if (!row || typeof row.id !== "string" || typeof row.trackingCode !== "string" || typeof row.title !== "string"
    || typeof row.status !== "string" || typeof row.createdAt !== "string" || typeof row.updatedAt !== "string"
    || (row.type !== "request" && row.type !== "booking" && row.type !== "venue_booking")) {
    throw new Error("Tracking RPC returned an invalid submission")
  }
  return row as PublicSubmission
}

function throwMutationError(result: Record<string, unknown>): void {
  if (result.error === "not_found") throw new SubmissionNotFoundError()
  if (result.error === "stale") throw new SubmissionStaleError()
  if (result.error === "locked") throw new SubmissionLockedError()
  if (result.error === "invalid") throw new SubmissionInvalidError()
  if (result.error === "conflict") throw new SubmissionConflictError()
}

function parseUpdateResult(value: unknown): UpdateSubmissionResult {
  const result = asRecord(value)
  if (!result) throw new Error("Update RPC returned an invalid result")
  throwMutationError(result)
  if (typeof result.entityId !== "string") throw new Error("Update RPC omitted the entity id")
  return { entityId: result.entityId, submission: parseSubmission(result.submission) }
}

function parseDeleteResult(value: unknown): DeleteSubmissionResult {
  const result = asRecord(value)
  if (!result) throw new Error("Delete RPC returned an invalid result")
  throwMutationError(result)
  if (typeof result.entityId !== "string") throw new Error("Delete RPC omitted the entity id")
  return { entityId: result.entityId }
}

async function queryAsPublicActor<Row extends QueryResultRow>(sql: string, values: readonly unknown[] = []): Promise<Row[]> {
  return withActor({ userId: null, workspaceId: null, role: "moc_public" }, (client) => queryRows<Row>(sql, values, client))
}

export function createPublicSubmissionStore(query: PublicSubmissionQuery = queryAsPublicActor): PublicSubmissionStore {
  return {
    async lookup(trackingCode) {
      const functionName = trackingCode.startsWith("VEN-") ? "api_lookup_tracking_venue_booking" : "api_lookup_tracking_submission"
      const rows = await query<{ result: unknown }>(`SELECT public.${functionName}($1::text) AS result`, [trackingCode])
      const value = rows[0]?.result
      return value === null || value === undefined ? null : parseSubmission(value)
    },
    async update(trackingCode, type, updatedAt, data) {
      const rows = type === "venue_booking"
        ? await query<{ result: unknown }>("SELECT public.api_update_tracking_venue_booking($1::text, $2::timestamptz, $3::jsonb) AS result", [trackingCode, updatedAt, data])
        : await query<{ result: unknown }>("SELECT public.api_update_tracking_submission($1::text, $2::text, $3::timestamptz, $4::jsonb) AS result", [trackingCode, type, updatedAt, data])
      return parseUpdateResult(rows[0]?.result)
    },
    async delete(trackingCode, type, updatedAt) {
      const rows = await query<{ result: unknown }>("SELECT public.api_delete_tracking_submission($1::text, $2::text, $3::timestamptz) AS result", [trackingCode, type, updatedAt])
      return parseDeleteResult(rows[0]?.result)
    },
  }
}

let cachedStore: PublicSubmissionStore | null = null

export function getPublicSubmissionStore(): PublicSubmissionStore {
  cachedStore ??= createPublicSubmissionStore()
  return cachedStore
}
