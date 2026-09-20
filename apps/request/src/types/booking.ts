export type BookingStatus = 'booked' | 'checked_out' | 'returned' | 'archived'

export type BookingFormData = {
  title: string
  equipmentIds: string[]
  // Public bookings currently capture requested equipment labels rather than
  // allocating inventory rows. The backend stores these separately from notes
  // so the requester can safely edit them later.
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
