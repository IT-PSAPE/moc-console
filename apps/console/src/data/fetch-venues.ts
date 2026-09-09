import type { Venue } from "@moc/types/venues";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

export const VENUE_SELECT = "id, workspace_id, name, location, capacity, notes, active, sort_order, created_at, updated_at";

export type VenueRow = {
  id: string;
  workspace_id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  notes: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function mapVenueRow(row: VenueRow): Venue {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    location: row.location,
    capacity: row.capacity,
    notes: row.notes,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchVenues(workspaceId?: string): Promise<Venue[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("venues")
    .select(VENUE_SELECT)
    .eq("workspace_id", resolvedWorkspaceId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as VenueRow[]).map(mapVenueRow);
}
