export type VenueEvent = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** The event shape the public request app sees: active events, no internals. */
export type PublicVenueEvent = {
  id: string;
  name: string;
  description: string | null;
};

/**
 * The id the "Other" choice carries in a picker. It is not a venue_events row
 * — choosing it means sending no event_id at all, plus free text — so it
 * needs a sentinel that can never collide with a real uuid.
 */
export const VENUE_EVENT_OTHER_ID = "other";
