import type { VenueEvent } from "@moc/types/venues";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { VENUE_EVENT_SELECT, mapVenueEventRow, type VenueEventRow } from "./fetch-venue-events";

export type VenueEventDraft = {
  name: string;
  description: string | null;
};

// venue_bookings.event_id is ON DELETE RESTRICT, so an event that has ever
// been booked cannot be deleted at the database. Surface that as a specific,
// actionable message instead of the raw constraint error.
const FOREIGN_KEY_VIOLATION = "23503";

export async function createVenueEvent(draft: VenueEventDraft, workspaceId?: string): Promise<VenueEvent> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("venue_events")
    .insert({
      workspace_id: resolvedWorkspaceId,
      name: draft.name,
      description: draft.description,
    })
    .select(VENUE_EVENT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVenueEventRow(data as VenueEventRow);
}

export async function updateVenueEvent(id: string, draft: VenueEventDraft): Promise<VenueEvent> {
  const { data, error } = await supabase
    .from("venue_events")
    .update({
      name: draft.name,
      description: draft.description,
    })
    .eq("id", id)
    .select(VENUE_EVENT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVenueEventRow(data as VenueEventRow);
}

export async function setVenueEventActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("venue_events")
    .update({ active })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteVenueEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from("venue_events")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      throw new Error("This event has bookings, so it can't be deleted. Deactivate it instead.");
    }
    throw new Error(error.message);
  }
}
