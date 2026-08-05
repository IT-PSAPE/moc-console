import { processPendingOutboxForEntity, type OutboxRunResult } from "./outbox.js"
import {
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  consumeRateLimit,
  hashRateLimitRequestSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
  type RateLimitDecision,
} from "../rate-limit.js"
import { getSupabaseAdmin } from "../supabase-admin.js"
import { hasBoundedPublicWakeBody, parsePublicNotificationWake, type PublicNotificationWakeOptions } from "./public-wake-input.js"
import type { ApiRequest, ApiResponse } from "../http.js"

export { parsePublicNotificationWake, type PublicNotificationWake, type PublicNotificationWakeOptions } from "./public-wake-input.js"
type PublicWakeLookup = (entityType: PublicNotificationWakeOptions["entityType"], entityId: string, trackingCode: string) => Promise<string | null>
type PublicWakeDispatch = (
  entityType: PublicNotificationWakeOptions["entityType"],
  entityId: string,
  eventType: PublicNotificationWakeOptions["eventType"],
) => Promise<OutboxRunResult>

export type PublicWakeDependencies = {
  lookup: PublicWakeLookup
  dispatch: PublicWakeDispatch
  limit: (request: ApiRequest, entityType: PublicNotificationWakeOptions["entityType"]) => Promise<RateLimitDecision>
  logError: (message: string, error: unknown) => void
}

async function lookupPublicWakeEntity(
  entityType: PublicNotificationWakeOptions["entityType"],
  entityId: string,
  trackingCode: string,
): Promise<string | null> {
  const table = entityType === "request" ? "requests" : "bookings"
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from(table)
    .select("id")
    .eq("id", entityId)
    .eq("tracking_code", trackingCode)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return typeof data?.id === "string" ? data.id : null
}

async function dispatchPublicWake(
  entityType: PublicNotificationWakeOptions["entityType"],
  entityId: string,
  eventType: PublicNotificationWakeOptions["eventType"],
): Promise<OutboxRunResult> {
  return processPendingOutboxForEntity(entityType, entityId, eventType)
}

export function publicWakeRateLimitSubject(
  request: ApiRequest,
  entityType: PublicNotificationWakeOptions["entityType"],
): string {
  return hashRateLimitRequestSubject(request, ["public-notification-wake", entityType])
}

async function limitPublicWake(
  request: ApiRequest,
  entityType: PublicNotificationWakeOptions["entityType"],
): Promise<RateLimitDecision> {
  const subjectHash = publicWakeRateLimitSubject(request, entityType)
  return consumeRateLimit(RATE_LIMIT_POLICIES.publicNotificationWake, subjectHash)
}

const defaultDependencies: PublicWakeDependencies = {
  lookup: lookupPublicWakeEntity,
  dispatch: dispatchPublicWake,
  limit: limitPublicWake,
  logError(message, error) {
    console.error(message, error)
  },
}

function invalidRequest(response: ApiResponse): void {
  response.status(400).json({ error: "Invalid notification wake request" })
}

function internalFailure(response: ApiResponse): void {
  response.status(500).json({ error: "Unable to process notification wake" })
}

export async function handlePublicNotificationWake(
  request: ApiRequest,
  response: ApiResponse,
  options: PublicNotificationWakeOptions,
  dependencies: PublicWakeDependencies = defaultDependencies,
): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST")
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  if (!hasBoundedPublicWakeBody(request)) {
    invalidRequest(response)
    return
  }

  const wake = parsePublicNotificationWake(request.body, options)
  if (!wake) {
    invalidRequest(response)
    return
  }

  let decision: RateLimitDecision
  try {
    decision = await dependencies.limit(request, options.entityType)
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      writeRateLimitUnavailable(response)
      return
    }
    dependencies.logError(`Public ${options.entityType} notification wake rate limit failed`, error)
    internalFailure(response)
    return
  }
  if (!decision.allowed) {
    writeRateLimitExceeded(response, decision)
    return
  }

  let entityId: string | null
  try {
    entityId = await dependencies.lookup(options.entityType, wake.entityId, wake.trackingCode)
  } catch (error) {
    dependencies.logError(`Public ${options.entityType} notification wake lookup failed`, error)
    internalFailure(response)
    return
  }

  if (!entityId) {
    response.status(404).json({ error: options.notFoundMessage })
    return
  }

  try {
    await dependencies.dispatch(options.entityType, entityId, options.eventType)
  } catch (error) {
    dependencies.logError(`Public ${options.entityType} notification wake dispatch failed`, error)
    internalFailure(response)
    return
  }

  response.status(200).json({ ok: true })
}
