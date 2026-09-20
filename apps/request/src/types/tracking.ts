import type { BookingStatus, TrackingBookingItem } from "./booking"
import type { RequestPriority, RequestStatus } from "./request"
import type { VenueBookingPhase } from "@moc/types/venues"

type TrackingBase = {
  id: string
  trackingCode: string
  title: string
  createdAt: string
  updatedAt: string
}

export type TrackingRequestResult = TrackingBase & {
  type: "request"
  status: RequestStatus
  priority: RequestPriority
  category: string
  categoryName: string
  requestedBy: string
  dueDate: string
  who: string
  what: string
  whenText: string
  whereText: string
  why: string
  how: string
  notes: string | null
  flow: string | null
}

export type TrackingBookingResult = TrackingBase & {
  type: "booking"
  status: BookingStatus
  bookedBy: string
  checkedOutAt: string
  expectedReturnAt: string
  returnedAt: string | null
  notes: string | null
  requestedEquipment: string[]
  otherEquipment: string
  items: TrackingBookingItem[]
}

export type TrackingVenueBookingResult = TrackingBase & {
  type: "venue_booking"
  status: VenueBookingPhase
  requestedBy: string
  venueId: string
  venueName: string
  venueLocation: string | null
  eventId: string | null
  eventName: string | null
  eventOther: string | null
  timeZone: string
  startsAt: string
  endsAt: string
  slotStarts: string[]
  notes: string | null
}

export type TrackingResult = TrackingRequestResult | TrackingBookingResult | TrackingVenueBookingResult

export type SubmissionType = TrackingResult["type"]

export type RequestCategoryOption = {
  value: string
  label: string
}
