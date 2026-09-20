import { getSupabaseAdmin } from "../supabase-admin.js"
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

export type UpdateSubmissionResult = { entityId: string; submission: PublicSubmission }
export type DeleteSubmissionResult = { entityId: string }

export type PublicSubmissionStore = {
  lookup: (trackingCode: string) => Promise<PublicSubmission | null>
  update: (trackingCode: string, type: SubmissionType, updatedAt: string, data: Record<string, unknown>) => Promise<UpdateSubmissionResult>
  delete: (trackingCode: string, type: SubmissionType, updatedAt: string) => Promise<DeleteSubmissionResult>
}

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

function createProductionStore(): PublicSubmissionStore {
  return {
    async lookup(trackingCode) {
      const { data, error } = await getSupabaseAdmin().rpc("api_lookup_tracking_submission", { p_tracking_code: trackingCode })
      if (error) throw new Error("Tracking lookup failed")
      return data === null ? null : parseSubmission(data)
    },
    async update(trackingCode, type, updatedAt, data) {
      const result = await getSupabaseAdmin().rpc("api_update_tracking_submission", {
        p_tracking_code: trackingCode,
        p_type: type,
        p_updated_at: updatedAt,
        p_data: data,
      })
      if (result.error) throw new Error("Tracking update failed")
      return parseUpdateResult(result.data)
    },
    async delete(trackingCode, type, updatedAt) {
      const result = await getSupabaseAdmin().rpc("api_delete_tracking_submission", {
        p_tracking_code: trackingCode,
        p_type: type,
        p_updated_at: updatedAt,
      })
      if (result.error) throw new Error("Tracking deletion failed")
      return parseDeleteResult(result.data)
    },
  }
}

let cachedStore: PublicSubmissionStore | null = null

export function getPublicSubmissionStore(): PublicSubmissionStore {
  cachedStore ??= createProductionStore()
  return cachedStore
}
