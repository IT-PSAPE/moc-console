export type BookingStatus = 'booked' | 'checked_out' | 'returned'

export type BookingFormData = {
  title: string
  equipmentIds: string[]
  // TODO(equipment-inventory): STOPGAP fields. While live inventory is
  // disabled, equipment is chosen from a hardcoded list (requestedEquipment)
  // plus a free-text "Other" (otherEquipment); these are folded into `notes`
  // at submit and `equipmentIds` stays empty. Remove both once the real
  // equipment browser is restored (see booking-equipment-picker.tsx).
  requestedEquipment: string[]
  otherEquipment: string
  bookedBy: string
  checkedOutAt: string
  expectedReturnAt: string
  notes: string
}

export type SubmitBookingResult = {
  bookingId: string
  trackingCode: string
  title: string
}

// Booking items carry no lifecycle of their own — status / returned_at
// live on the parent booking. The tracking lookup returns just enough
// to render the equipment list inside the booking.
export type TrackingBookingItem = {
  id: string
  equipmentId: string
  equipmentName: string
  equipmentCategory: string
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
  returnedAt?: string | null
  notes?: string
  items?: TrackingBookingItem[]
}
