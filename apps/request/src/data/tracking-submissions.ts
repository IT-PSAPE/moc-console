import { PublicSubmissionApiError } from "@moc/sdk"
import { moc } from "@/lib/moc-client"
import { parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time"
import type { BookingFormData } from "@/types/booking"
import type { RequestFormData } from "@/types/request"
import type { TrackingResult, TrackingVenueBookingResult } from "@/types/tracking"
import type { VenueBookingFormData } from "@/types/venue-booking"

export class TrackingSubmissionError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "TrackingSubmissionError"
    this.status = status
  }
}

async function retainTrackingError<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation
  } catch (error) {
    if (error instanceof PublicSubmissionApiError) throw new TrackingSubmissionError(error.message, error.status)
    throw error
  }
}

export async function lookupTrackingCode(code: string): Promise<TrackingResult | null> {
  return retainTrackingError(moc.publicSubmissions.lookupTracking<TrackingResult>(code))
}

export async function updateTrackedRequest(result: Extract<TrackingResult, { type: "request" }>, data: RequestFormData): Promise<TrackingResult> {
  return retainTrackingError(moc.publicSubmissions.updateTracking<TrackingResult>({
    trackingCode: result.trackingCode,
    type: result.type,
    updatedAt: result.updatedAt,
    data: {
      ...data,
      dueDate: parseBrowserDateTimeInputToUtcIso(data.dueDate),
      notes: data.notes.trim(),
      flow: data.flow.trim(),
    },
  }))
}

export async function updateTrackedBooking(result: Extract<TrackingResult, { type: "booking" }>, data: BookingFormData): Promise<TrackingResult> {
  return retainTrackingError(moc.publicSubmissions.updateTracking<TrackingResult>({
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
  }))
}

export async function updateTrackedVenueBooking(result: TrackingVenueBookingResult, data: VenueBookingFormData): Promise<TrackingResult> {
  return retainTrackingError(moc.publicSubmissions.updateTracking<TrackingResult>({
    trackingCode: result.trackingCode,
    type: result.type,
    updatedAt: result.updatedAt,
    data: {
      requestedBy: data.requestedBy,
      venueId: data.venueId,
      eventId: data.eventId === "other" ? null : data.eventId,
      eventOther: data.eventId === "other" ? data.eventOther.trim() : null,
      slotStarts: data.slotStarts,
      recurrence: data.recurrence,
    },
  }))
}

export async function deleteTrackedSubmission(result: TrackingResult): Promise<void> {
  await retainTrackingError(moc.publicSubmissions.deleteTracking({
    trackingCode: result.trackingCode,
    type: result.type,
    updatedAt: result.updatedAt,
  }))
}
