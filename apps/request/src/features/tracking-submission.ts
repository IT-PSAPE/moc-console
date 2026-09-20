import { formatUtcIsoForBrowserDateTimeInput } from "@moc/utils/browser-date-time"
import { formatUtcIsoForDateTimeInput } from "@moc/utils/zoned-date-time"
import { VENUE_EVENT_OTHER_ID } from "@moc/types/venues"
import type { BookingFormData } from "@/types/booking"
import type { RequestFormData } from "@/types/request"
import type { VenueBookingFormData } from "@/types/venue-booking"
import type { TrackingBookingResult, TrackingRequestResult, TrackingVenueBookingResult } from "@/types/tracking"

type TrackingShareData = {
  title: string
  text: string
  url: string
}

export function buildTrackingShareData(trackingCode: string, origin: string): TrackingShareData {
  const url = `${origin.replace(/\/$/, "")}/track`
  return {
    title: "MOC request tracking details",
    text: [
      "MOC REQUEST TRACKING DETAILS",
      "",
      "IMPORTANT: Keep this tracking code safe and private.",
      "",
      "Tracking code:",
      trackingCode,
      "",
      "Anyone with this code can view, update, or delete the submission.",
      "",
      "Open the tracking page and enter the code:",
      "",
      "",
      url,
    ].join("\n"),
    url,
  }
}

export function canRequesterModify(result: TrackingRequestResult | TrackingBookingResult | TrackingVenueBookingResult, now = new Date()): boolean {
  if (result.type === "request") return result.status !== "completed" && result.status !== "archived"
  if (result.type === "booking") return result.status === "booked" && new Date(result.checkedOutAt) > now
  return result.status === "booked" && new Date(result.startsAt) > now
}

export function toRequestEditData(result: TrackingRequestResult): RequestFormData {
  return {
    title: result.title,
    priority: result.priority,
    category: result.category,
    dueDate: formatUtcIsoForBrowserDateTimeInput(result.dueDate),
    requestedBy: result.requestedBy,
    who: result.who,
    what: result.what,
    whenText: result.whenText,
    whereText: result.whereText,
    why: result.why,
    how: result.how,
    notes: result.notes ?? "",
    flow: result.flow ?? "",
  }
}

export function toBookingEditData(result: TrackingBookingResult): BookingFormData {
  return {
    title: result.title,
    equipmentIds: result.items.map((item) => item.equipmentId),
    requestedEquipment: result.requestedEquipment,
    otherEquipment: result.otherEquipment,
    bookedBy: result.bookedBy,
    checkedOutAt: formatUtcIsoForBrowserDateTimeInput(result.checkedOutAt),
    expectedReturnAt: formatUtcIsoForBrowserDateTimeInput(result.expectedReturnAt),
    notes: result.notes ?? "",
  }
}

export function toVenueEditData(result: TrackingVenueBookingResult): VenueBookingFormData {
  return {
    requestedBy: result.requestedBy,
    venueId: result.venueId,
    eventId: result.eventId ?? VENUE_EVENT_OTHER_ID,
    eventOther: result.eventOther ?? "",
    bookingDate: formatUtcIsoForDateTimeInput(result.startsAt, result.timeZone).slice(0, 10),
    slotStarts: result.slotStarts,
  }
}
