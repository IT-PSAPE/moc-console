import type { VenueEvent } from "@moc/types/venues";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

export const VENUE_EVENT_SELECT = "id, workspace_id, name, description, active, sort_order, created_at, updated_at";

export type VenueEventRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function mapVenueEventRow(row: VenueEventRow): VenueEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchVenueEvents(workspaceId?: string): Promise<VenueEvent[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("venue_events")
    .select(VENUE_EVENT_SELECT)
    .eq("workspace_id", resolvedWorkspaceId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as VenueEventRow[]).map(mapVenueEventRow);
}
