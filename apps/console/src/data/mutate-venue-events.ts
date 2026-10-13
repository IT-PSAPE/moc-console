import type { VenueEvent } from "@moc/types/venues";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export type VenueEventDraft = {
  name: string;
  description: string | null;
};

export async function createVenueEvent(draft: VenueEventDraft, workspaceId?: string): Promise<VenueEvent> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.venues.createEvent(draft, resolvedWorkspaceId);
}

export async function updateVenueEvent(id: string, draft: VenueEventDraft, workspaceId?: string): Promise<VenueEvent> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.venues.updateEvent(id, draft, resolvedWorkspaceId);
}

export async function setVenueEventActive(id: string, active: boolean, workspaceId?: string): Promise<void> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  await moc.venues.setEventActive(id, active, resolvedWorkspaceId);
}

export async function deleteVenueEvent(id: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.venues.deleteEvent(id, workspaceId);
}
