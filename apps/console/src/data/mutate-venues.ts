import type { Venue } from "@moc/types/venues";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export type VenueDraft = {
  name: string;
  description: string | null;
};

export async function createVenue(draft: VenueDraft, workspaceId?: string): Promise<Venue> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.venues.create(draft, resolvedWorkspaceId);
}

export async function updateVenue(id: string, draft: VenueDraft): Promise<Venue> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.venues.update(id, draft, workspaceId);
}

export async function setVenueActive(id: string, active: boolean): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.venues.setActive(id, active, workspaceId);
}

export async function deleteVenue(id: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.venues.delete(id, workspaceId);
}
