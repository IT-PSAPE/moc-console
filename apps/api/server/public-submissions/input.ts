const TRACKING_CODE_PATTERN = /^(REQ|BKG|VEN)-(?:[A-F0-9]{6}|[A-F0-9]{12})$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PRIORITIES = new Set(["low", "medium", "high", "urgent"])

export type SubmissionType = "request" | "booking" | "venue_booking"

export type PublicSubmission = {
  id: string
  trackingCode: string
  type: SubmissionType
  title: string
  status: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

export type ParsedLookupBody = { trackingCode: string }
export type ParsedUpdateBody = { trackingCode: string; type: SubmissionType; updatedAt: string; data: Record<string, unknown> }
export type ParsedDeleteBody = { trackingCode: string; type: SubmissionType; updatedAt: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record).sort()
  return actual.length === keys.length && [...keys].sort().every((key, index) => key === actual[index])
}

function isText(value: unknown, maximum: number, required = true): value is string {
  return typeof value === "string" && value.length <= maximum && (!required || value.trim().length > 0)
}

function isNullableText(value: unknown, maximum: number): boolean {
  return value === null || isText(value, maximum, false)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

function isTextArray(value: unknown, maximumItems: number, maximumLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maximumItems && value.every((entry) => isText(entry, maximumLength))
}

function isDateArray(value: unknown, maximumItems: number): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= maximumItems && value.every(isIsoDate)
}

function isSubmissionType(value: unknown): value is SubmissionType {
  return value === "request" || value === "booking" || value === "venue_booking"
}

function prefixMatches(type: SubmissionType, trackingCode: string): boolean {
  const expected = type === "request" ? "REQ-" : type === "booking" ? "BKG-" : "VEN-"
  return trackingCode.startsWith(expected)
}

function validRequestData(data: Record<string, unknown>): boolean {
  const keys = ["title", "requestedBy", "priority", "dueDate", "category", "who", "what", "whenText", "whereText", "why", "how", "notes", "flow"]
  return hasExactKeys(data, keys)
    && isText(data.title, 120) && isText(data.requestedBy, 200) && typeof data.priority === "string" && PRIORITIES.has(data.priority)
    && isIsoDate(data.dueDate) && isText(data.category, 120) && isText(data.who, 4000) && isText(data.what, 4000)
    && isText(data.whenText, 4000) && isText(data.whereText, 4000) && isText(data.why, 4000) && isText(data.how, 4000)
    && isText(data.notes, 10000, false) && isText(data.flow, 10000, false)
}

function validBookingData(data: Record<string, unknown>): boolean {
  const keys = ["title", "bookedBy", "checkedOutAt", "expectedReturnAt", "notes", "requestedEquipment", "otherEquipment"]
  return hasExactKeys(data, keys)
    && isText(data.title, 120) && isText(data.bookedBy, 200) && isIsoDate(data.checkedOutAt) && isIsoDate(data.expectedReturnAt)
    && Date.parse(data.checkedOutAt) > Date.now() && Date.parse(data.expectedReturnAt) > Date.parse(data.checkedOutAt) && isText(data.notes, 10000, false)
    && isTextArray(data.requestedEquipment, 50, 120) && isText(data.otherEquipment, 1000, false)
    && (data.requestedEquipment.length > 0 || data.otherEquipment.trim().length > 0)
}

function validVenueData(data: Record<string, unknown>): boolean {
  const keys = ["requestedBy", "venueId", "eventId", "eventOther", "slotStarts"]
  if (!hasExactKeys(data, keys) || !isText(data.requestedBy, 200) || !isUuid(data.venueId) || !isDateArray(data.slotStarts, 48)) return false
  if (!(data.eventId === null || isUuid(data.eventId)) || !isNullableText(data.eventOther, 120)) return false
  return (data.eventId === null) === (typeof data.eventOther === "string" && data.eventOther.trim().length > 0)
}

function validUpdateData(type: SubmissionType, data: Record<string, unknown>): boolean {
  if (type === "request") return validRequestData(data)
  if (type === "booking") return validBookingData(data)
  return validVenueData(data)
}

export function isValidTrackingCode(value: unknown): value is string {
  return typeof value === "string" && TRACKING_CODE_PATTERN.test(value)
}

export function parseLookupBody(body: unknown): ParsedLookupBody | string {
  if (!isRecord(body) || !hasExactKeys(body, ["trackingCode"]) || !isValidTrackingCode(body.trackingCode)) return "Invalid tracking lookup"
  return { trackingCode: body.trackingCode }
}

export function parseUpdateBody(body: unknown): ParsedUpdateBody | string {
  if (!isRecord(body) || !hasExactKeys(body, ["trackingCode", "type", "updatedAt", "data"])) return "Invalid update request"
  if (!isValidTrackingCode(body.trackingCode) || !isSubmissionType(body.type) || !prefixMatches(body.type, body.trackingCode) || !isIsoDate(body.updatedAt) || !isRecord(body.data)) return "Invalid update request"
  if (!validUpdateData(body.type, body.data)) return "Invalid submission details"
  return { trackingCode: body.trackingCode, type: body.type, updatedAt: body.updatedAt, data: body.data }
}

export function parseDeleteBody(body: unknown): ParsedDeleteBody | string {
  if (!isRecord(body) || !hasExactKeys(body, ["trackingCode", "type", "updatedAt"])) return "Invalid delete request"
  if (!isValidTrackingCode(body.trackingCode) || !isSubmissionType(body.type) || !prefixMatches(body.type, body.trackingCode) || !isIsoDate(body.updatedAt)) return "Invalid delete request"
  return { trackingCode: body.trackingCode, type: body.type, updatedAt: body.updatedAt }
}
