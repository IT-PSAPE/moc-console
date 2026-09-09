import type { Venue } from "@moc/types/venues";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { VENUE_SELECT, mapVenueRow, type VenueRow } from "./fetch-venues";

export type VenueDraft = {
  name: string;
  location: string | null;
  capacity: number | null;
  notes: string | null;
};

// venue_bookings.venue_id is ON DELETE RESTRICT, so a venue that has ever
// been booked cannot be deleted at the database. Surface that as a specific,
// actionable message instead of the raw constraint error.
const FOREIGN_KEY_VIOLATION = "23503";

export async function createVenue(draft: VenueDraft, workspaceId?: string): Promise<Venue> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("venues")
    .insert({
      workspace_id: resolvedWorkspaceId,
      name: draft.name,
      location: draft.location,
      capacity: draft.capacity,
      notes: draft.notes,
    })
    .select(VENUE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVenueRow(data as VenueRow);
}

export async function updateVenue(id: string, draft: VenueDraft): Promise<Venue> {
  const { data, error } = await supabase
    .from("venues")
    .update({
      name: draft.name,
      location: draft.location,
      capacity: draft.capacity,
      notes: draft.notes,
    })
    .eq("id", id)
    .select(VENUE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVenueRow(data as VenueRow);
}

export async function setVenueActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("venues")
    .update({ active })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteVenue(id: string): Promise<void> {
  const { error } = await supabase
    .from("venues")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      throw new Error("This venue has bookings, so it can't be deleted. Deactivate it instead.");
    }
    throw new Error(error.message);
  }
}
