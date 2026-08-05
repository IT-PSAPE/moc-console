import { createHmac, timingSafeEqual } from "node:crypto"

const MAX_INGEST_BYTES = 8 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i

type JsonObject = Record<string, unknown>

export type SignedIngestBody<EventType extends string> = {
  eventType: EventType
  entityId: string
  status: string | null | undefined
}

function isJsonObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function canonicalJsonValue(value: unknown): string | null {
  if (value === null) return "null"
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : null
  if (Array.isArray(value)) {
    const values = value.map(canonicalJsonValue)
    return values.some((item) => item === null) ? null : `[${values.join(",")}]`
  }
  if (!isJsonObject(value)) return null

  const entries: string[] = []
  for (const key of Object.keys(value).sort()) {
    const serialized = canonicalJsonValue(value[key])
    if (serialized === null) return null
    entries.push(`${JSON.stringify(key)}:${serialized}`)
  }
  return `{${entries.join(",")}}`
}

export function canonicalJson(value: unknown): string | null {
  const serialized = canonicalJsonValue(value)
  if (serialized === null || Buffer.byteLength(serialized, "utf8") > MAX_INGEST_BYTES) return null
  return serialized
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

function safeEqual(expected: string, provided: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8")
  const providedBytes = Buffer.from(provided, "utf8")
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
}

function signingPayload(body: unknown, timestamp: string, nonce: string): string | null {
  const serialized = canonicalJson(body)
  return serialized ? `${timestamp}.${nonce}.${serialized}` : null
}

export function verifyNotificationIngestSignature(
  body: unknown,
  provided: string | null,
  timestamp: string | null,
  nonce: string | null,
  secret = process.env.NOTIFICATIONS_INGEST_SECRET,
): boolean {
  if (!secret || !provided || !timestamp || !nonce || !SIGNATURE_PATTERN.test(provided)) return false
  const payload = signingPayload(body, timestamp, nonce)
  if (!payload) return false

  const expected = createHmac("sha256", secret).update(payload).digest("hex")
  return safeEqual(expected, provided)
}

export function parseSignedIngestBody<EventType extends string>(
  body: unknown,
  eventTypes: readonly EventType[],
  entityIdField: "request_id" | "booking_id",
): SignedIngestBody<EventType> | null {
  if (!isJsonObject(body)) return null

  const keys = Object.keys(body)
  const allowedKeys = new Set(["event_type", entityIdField, "status"])
  if (keys.length < 2 || keys.some((key) => !allowedKeys.has(key))) return null

  const eventType = body.event_type
  const entityId = body[entityIdField]
  const hasStatus = Object.hasOwn(body, "status")
  const status = body.status
  if (
    typeof eventType !== "string" ||
    !eventTypes.includes(eventType as EventType) ||
    !isUuid(entityId) ||
    (hasStatus && status !== null && (typeof status !== "string" || status.length > 64))
  ) {
    return null
  }
  if (eventType.endsWith(".status_changed") && !hasStatus) return null

  return {
    eventType: eventType as EventType,
    entityId,
    status: hasStatus ? status as string | null : undefined,
  }
}
