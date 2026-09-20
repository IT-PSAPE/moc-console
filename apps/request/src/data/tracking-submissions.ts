import { apiUrl } from "@moc/utils/api-url"
import { parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time"
import type { BookingFormData } from "@/types/booking"
import type { RequestFormData } from "@/types/request"
import type { TrackingResult, TrackingVenueBookingResult } from "@/types/tracking"
import type { VenueBookingFormData } from "@/types/venue-booking"

type TrackingResponse = {
  submission: TrackingResult
}

type ErrorResponse = {
  error?: string
}

export class TrackingSubmissionError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "TrackingSubmissionError"
    this.status = status
  }
}

async function parseError(response: Response): Promise<TrackingSubmissionError> {
  const body = await response.json().catch(() => null) as ErrorResponse | null
  return new TrackingSubmissionError(body?.error ?? "The submission could not be updated.", response.status)
}

async function requestTrackingApi(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>): Promise<Response> {
  return fetch(apiUrl("/api/public/submissions"), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export async function lookupTrackingCode(code: string): Promise<TrackingResult | null> {
  const response = await requestTrackingApi("POST", { trackingCode: code.trim().toUpperCase() })
  if (response.status === 404) return null
  if (!response.ok) throw await parseError(response)
  const body = await response.json() as TrackingResponse
  return body.submission
}

export async function updateTrackedRequest(result: Extract<TrackingResult, { type: "request" }>, data: RequestFormData): Promise<TrackingResult> {
  const response = await requestTrackingApi("PATCH", {
    trackingCode: result.trackingCode,
    type: result.type,
    updatedAt: result.updatedAt,
    data: {
      ...data,
      dueDate: parseBrowserDateTimeInputToUtcIso(data.dueDate),
      notes: data.notes.trim(),
      flow: data.flow.trim(),
    },
  })
  if (!response.ok) throw await parseError(response)
  return ((await response.json()) as TrackingResponse).submission
}

export async function updateTrackedBooking(result: Extract<TrackingResult, { type: "booking" }>, data: BookingFormData): Promise<TrackingResult> {
  const response = await requestTrackingApi("PATCH", {
    trackingCode: result.trackingCode,
    type: result.type,
    updatedAt: result.updatedAt,
    data: {
      title: data.title,
      bookedBy: data.bookedBy,
      checkedOutAt: parseBrowserDateTimeInputToUtcIso(data.checkedOutAt),
      expectedReturnAt: parseBrowserDateTimeInputToUtcIso(data.expectedReturnAt),
      notes: data.notes.trim(),
      requestedEquipment: data.requestedEquipment,
      otherEquipment: data.otherEquipment.trim(),
    },
  })
  if (!response.ok) throw await parseError(response)
  return ((await response.json()) as TrackingResponse).submission
}

export async function updateTrackedVenueBooking(result: TrackingVenueBookingResult, data: VenueBookingFormData): Promise<TrackingResult> {
  const response = await requestTrackingApi("PATCH", {
    trackingCode: result.trackingCode,
    type: result.type,
    updatedAt: result.updatedAt,
    data: {
      requestedBy: data.requestedBy,
      venueId: data.venueId,
      eventId: data.eventId === "other" ? null : data.eventId,
      eventOther: data.eventId === "other" ? data.eventOther.trim() : null,
      slotStarts: data.slotStarts,
    },
  })
  if (!response.ok) throw await parseError(response)
  return ((await response.json()) as TrackingResponse).submission
}

export async function deleteTrackedSubmission(result: TrackingResult): Promise<void> {
  const response = await requestTrackingApi("DELETE", {
    trackingCode: result.trackingCode,
    type: result.type,
    updatedAt: result.updatedAt,
  })
  if (!response.ok) throw await parseError(response)
}
