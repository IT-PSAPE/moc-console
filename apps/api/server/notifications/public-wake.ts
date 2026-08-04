type EntityIdField = "request_id" | "booking_id"

export type PublicNotificationWake = {
  entityId: string
  trackingCode: string
}

export function parsePublicNotificationWake(body: unknown, entityIdField: EntityIdField): PublicNotificationWake | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length !== 2 || !keys.includes(entityIdField) || !keys.includes("tracking_code")) return null

  const entityId = record[entityIdField]
  const trackingCode = record.tracking_code
  if (typeof entityId !== "string" || !entityId || typeof trackingCode !== "string" || !trackingCode) return null

  return { entityId, trackingCode }
}
