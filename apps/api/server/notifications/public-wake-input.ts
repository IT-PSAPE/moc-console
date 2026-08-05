import { headerValue, type ApiRequest } from "../http.js"

type EntityIdField = "request_id" | "booking_id"
type EntityType = "request" | "booking"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_PUBLIC_WAKE_BODY_BYTES = 512
const TRACKING_CODE_PATTERN: Record<EntityType, RegExp> = {
  request: /^REQ-[A-F0-9]{6}$/,
  booking: /^BKG-[A-F0-9]{6}$/,
}

export type PublicNotificationWake = {
  entityId: string
  trackingCode: string
}

export type PublicNotificationWakeOptions = {
  entityIdField: EntityIdField
  entityType: EntityType
  eventType: "request.created" | "booking.created"
  notFoundMessage: string
}

function isValidEntityId(value: string): boolean {
  return value.length === 36 && UUID_PATTERN.test(value)
}

function isValidTrackingCode(value: string, entityType: EntityType): boolean {
  return value.length === 10 && TRACKING_CODE_PATTERN[entityType].test(value)
}

export function hasBoundedPublicWakeBody(request: ApiRequest): boolean {
  const contentLength = headerValue(request.headers, "content-length")
  if (contentLength === null) return true
  if (!/^\d+$/.test(contentLength)) return false
  return Number(contentLength) <= MAX_PUBLIC_WAKE_BODY_BYTES
}

export function parsePublicNotificationWake(
  body: unknown,
  { entityIdField, entityType }: Pick<PublicNotificationWakeOptions, "entityIdField" | "entityType">,
): PublicNotificationWake | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length !== 2 || !keys.includes(entityIdField) || !keys.includes("tracking_code")) return null

  const entityId = record[entityIdField]
  const trackingCode = record.tracking_code
  if (
    typeof entityId !== "string" ||
    typeof trackingCode !== "string" ||
    !isValidEntityId(entityId) ||
    !isValidTrackingCode(trackingCode, entityType)
  ) {
    return null
  }

  return { entityId, trackingCode }
}
