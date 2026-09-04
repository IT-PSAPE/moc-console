export type Venue = {
  id: string;
  workspaceId: string;
  name: string;
  location: string | null;
  capacity: number | null;
  notes: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** The venue shape the public request app sees: active venues, no internals. */
export type PublicVenue = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
};
