import type { VenueEvent } from "@moc/types/venues";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function fetchVenueEvents(workspaceId?: string): Promise<VenueEvent[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.venues.listEvents(resolvedWorkspaceId);
}
