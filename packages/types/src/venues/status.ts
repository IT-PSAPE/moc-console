/**
 * What the database stores. 'auto' means "booked, awaiting a decision, follow
 * the clock". 'approved' and 'rejected' are staff decisions, and 'cancelled'
 * is a cancellation. Rejected and cancelled bookings release their slots.
 */
export type VenueBookingStatus = "auto" | "approved" | "rejected" | "cancelled";

/**
 * What a reader sees. Derived from the stored status and the booked slot
 * times — never stored, never written. See deriveVenueBookingPhase.
 */
export type VenueBookingPhase = "booked" | "approved" | "in_progress" | "completed" | "rejected" | "cancelled";
