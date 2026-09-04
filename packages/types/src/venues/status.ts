/**
 * What the database stores. Only these two states are ever written: 'auto'
 * means "follow the clock", and 'cancelled' is the one state a human sets.
 */
export type VenueBookingStatus = "auto" | "cancelled";

/**
 * What a reader sees. Derived from the stored status and the booked slot
 * times — never stored, never written. See deriveVenueBookingPhase.
 */
export type VenueBookingPhase = "booked" | "in_progress" | "completed" | "cancelled";
