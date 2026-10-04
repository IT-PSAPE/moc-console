import type { Venue } from "@moc/types/venues";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function fetchVenues(workspaceId?: string): Promise<Venue[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.venues.list(resolvedWorkspaceId);
}
