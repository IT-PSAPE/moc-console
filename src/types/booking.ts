export type BookingStatus = 'booked' | 'checked_out' | 'returned'

export type BookingFormData = {
  equipmentIds: string[]
  bookedBy: string
  checkedOutAt: string
  expectedReturnAt: string
  notes: string
}

export type SubmitBookingResult = {
  trackingCode: string
}

export type TrackingBookingItem = {
  id: string
  equipmentName: string
  status: string
  checkedOutAt: string
  expectedReturnAt: string
  returnedAt: string | null
}

export type TrackingResult = {
  type: 'request' | 'booking'
  trackingCode: string
  status?: string
  title?: string
  priority?: string
  category?: string
  requestedBy?: string
  dueDate?: string
  createdAt: string
  bookedBy?: string
  checkedOutAt?: string
  expectedReturnAt?: string
  items?: TrackingBookingItem[]
}
