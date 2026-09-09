import type { VenueBookingPhase } from "./status";

// ─── The bookable day ──────────────────────────────────
// 08:00 to 23:00 in the workspace's own time zone, in 30-minute steps: 30
// slots, the last running 22:30–23:00. These mirror public.venue_slot_grid;
// changing the day here without changing the SQL would let the picker offer a
// slot the database rejects.

export const VENUE_SLOT_MINUTES = 30;
export const VENUE_DAY_START_HOUR = 8;
export const VENUE_DAY_END_HOUR = 23;
export const VENUE_SLOTS_PER_DAY =
  ((VENUE_DAY_END_HOUR - VENUE_DAY_START_HOUR) * 60) / VENUE_SLOT_MINUTES;

// ─── Labels ────────────────────────────────────────────

export const venueBookingPhaseLabel: Record<VenueBookingPhase, string> = {
  booked: "Booked",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ─── Colors ────────────────────────────────────────────

export const venueBookingPhaseColor = {
  booked: "blue",
  in_progress: "yellow",
  completed: "green",
  cancelled: "gray",
} as const satisfies Record<VenueBookingPhase, string>;

// ─── Groups ────────────────────────────────────────────
// Kanban columns. Only the Cancelled column is a real destination: the other
// three are derived from the clock, so a card cannot be dragged between them.

export const venueBookingPhaseGroups = [
  { key: "booked", label: "Booked", color: "blue" },
  { key: "in_progress", label: "In Progress", color: "yellow" },
  { key: "completed", label: "Completed", color: "green" },
  { key: "cancelled", label: "Cancelled", color: "gray" },
] as const;
