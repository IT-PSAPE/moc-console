export type Venue = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** The venue shape the public request app sees: active venues, no internals. */
export type PublicVenue = {
  id: string;
  name: string;
  description: string | null;
};
