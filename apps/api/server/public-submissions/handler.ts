import type { NotificationEventKey } from "@moc/notifications"
import { applyCors, isAllowedOrigin } from "../cors.js"
import { headerValue, type ApiRequest, type ApiResponse } from "../http.js"
import { processPendingOutboxForEntity } from "../notifications/outbox.js"
import { observeApiRequest } from "../observability.js"
import {
  RATE_LIMIT_POLICIES,
  consumeRateLimit,
  hashRateLimitRequestSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
  type RateLimitDecision,
  type RateLimitPolicy,
} from "../rate-limit.js"
import { parseDeleteBody, parseLookupBody, parseUpdateBody, type SubmissionType } from "./input.js"
import {
  getPublicSubmissionStore,
  SubmissionInvalidError,
  SubmissionLockedError,
  SubmissionNotFoundError,
  SubmissionStaleError,
  type PublicSubmissionStore,
} from "./store.js"

const MAX_BODY_BYTES = 32 * 1024
const ALLOWED_METHODS = "POST, PATCH, DELETE, OPTIONS"

const updatedEvents: Record<SubmissionType, NotificationEventKey> = {
  request: "request.requester_updated",
  booking: "booking.requester_updated",
  venue_booking: "venue_booking.requester_updated",
}

const deletedEvents: Record<SubmissionType, NotificationEventKey> = {
  request: "request.requester_deleted",
  booking: "booking.requester_deleted",
  venue_booking: "venue_booking.requester_deleted",
}

export type PublicSubmissionHandlerDeps = {
  store: PublicSubmissionStore
  limit: (request: ApiRequest, policy: RateLimitPolicy, operation: "lookup" | "mutation") => Promise<RateLimitDecision>
  processOutbox: (entityType: string, entityId: string, eventType: NotificationEventKey) => Promise<{ attempted: number }>
}

function writeError(response: ApiResponse, status: number, error: string): void {
  response.status(status).json({ error })
}

function hasBoundedBody(request: ApiRequest): boolean {
  const contentLength = headerValue(request.headers, "content-length")
  if (contentLength !== null) return /^\d+$/.test(contentLength) && Number(contentLength) <= MAX_BODY_BYTES
  try {
    return JSON.stringify(request.body ?? null).length <= MAX_BODY_BYTES
  } catch {
    return false
  }
}

async function limitRequest(request: ApiRequest, policy: RateLimitPolicy, operation: "lookup" | "mutation"): Promise<RateLimitDecision> {
  const subject = hashRateLimitRequestSubject(request, ["public-submission", operation])
  return consumeRateLimit(policy, subject)
}

const defaultDependencies: PublicSubmissionHandlerDeps = {
  store: getPublicSubmissionStore(),
  limit: limitRequest,
  processOutbox: processPendingOutboxForEntity,
}

async function applyRateLimit(request: ApiRequest, response: ApiResponse, deps: PublicSubmissionHandlerDeps, policy: RateLimitPolicy, operation: "lookup" | "mutation"): Promise<boolean> {
  let decision: RateLimitDecision
  try {
    decision = await deps.limit(request, policy, operation)
  } catch {
    writeRateLimitUnavailable(response)
    return false
  }
  if (!decision.allowed) {
    writeRateLimitExceeded(response, decision)
    return false
  }
  return true
}

function writeMutationError(response: ApiResponse, error: unknown): void {
  if (error instanceof SubmissionNotFoundError) return writeError(response, 404, "Submission not found")
  if (error instanceof SubmissionStaleError) return writeError(response, 409, "This submission changed elsewhere. Refresh it and try again.")
  if (error instanceof SubmissionLockedError) return writeError(response, 409, "This submission can no longer be changed.")
  if (error instanceof SubmissionInvalidError) return writeError(response, 400, "The submission details are invalid.")
  writeError(response, 500, "The submission could not be changed.")
}

async function wakeOutbox(deps: PublicSubmissionHandlerDeps, type: SubmissionType, entityId: string, eventType: NotificationEventKey): Promise<void> {
  try {
    await deps.processOutbox(type, entityId, eventType)
  } catch {
    // The mutation committed its durable outbox row transactionally. Delivery
    // remains eligible for the retry cron if this immediate wake fails.
  }
}

async function handleLookup(request: ApiRequest, response: ApiResponse, deps: PublicSubmissionHandlerDeps): Promise<void> {
  const parsed = parseLookupBody(request.body)
  if (typeof parsed === "string") return writeError(response, 400, parsed)
  if (!await applyRateLimit(request, response, deps, RATE_LIMIT_POLICIES.publicSubmissionLookup, "lookup")) return
  try {
    const submission = await deps.store.lookup(parsed.trackingCode)
    if (!submission) return writeError(response, 404, "Submission not found")
    response.status(200).json({ submission })
  } catch {
    writeError(response, 500, "The submission could not be loaded.")
  }
}

async function handleUpdate(request: ApiRequest, response: ApiResponse, deps: PublicSubmissionHandlerDeps): Promise<void> {
  const parsed = parseUpdateBody(request.body)
  if (typeof parsed === "string") return writeError(response, 400, parsed)
  if (!await applyRateLimit(request, response, deps, RATE_LIMIT_POLICIES.publicSubmissionMutation, "mutation")) return
  try {
    const result = await deps.store.update(parsed.trackingCode, parsed.type, parsed.updatedAt, parsed.data)
    await wakeOutbox(deps, parsed.type, result.entityId, updatedEvents[parsed.type])
    response.status(200).json({ submission: result.submission })
  } catch (error) {
    writeMutationError(response, error)
  }
}

async function handleDelete(request: ApiRequest, response: ApiResponse, deps: PublicSubmissionHandlerDeps): Promise<void> {
  const parsed = parseDeleteBody(request.body)
  if (typeof parsed === "string") return writeError(response, 400, parsed)
  if (!await applyRateLimit(request, response, deps, RATE_LIMIT_POLICIES.publicSubmissionMutation, "mutation")) return
  try {
    const result = await deps.store.delete(parsed.trackingCode, parsed.type, parsed.updatedAt)
    await wakeOutbox(deps, parsed.type, result.entityId, deletedEvents[parsed.type])
    response.status(200).json({ ok: true })
  } catch (error) {
    writeMutationError(response, error)
  }
}

export async function handlePublicSubmission(request: ApiRequest, response: ApiResponse, deps: PublicSubmissionHandlerDeps = defaultDependencies): Promise<void> {
  response.setHeader("Content-Type", "application/json")
  response.setHeader("Cache-Control", "no-store")
  if (applyCors(request, response)) return
  if (!isAllowedOrigin(headerValue(request.headers, "origin"))) return writeError(response, 403, "Forbidden origin")
  if (!hasBoundedBody(request)) return writeError(response, 413, "Request body is too large")

  if (request.method === "POST") return handleLookup(request, response, deps)
  if (request.method === "PATCH") return handleUpdate(request, response, deps)
  if (request.method === "DELETE") return handleDelete(request, response, deps)
  response.setHeader("Allow", ALLOWED_METHODS)
  writeError(response, 405, "Method not allowed")
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("public.submissions", request, response, async () => handlePublicSubmission(request, response))
}
