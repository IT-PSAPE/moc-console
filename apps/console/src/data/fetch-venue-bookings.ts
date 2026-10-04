import type { VenueBooking } from "@moc/types/venues";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

/** Includes every stored status; the displayed lifecycle phase is derived from status and occurrence times. */
export async function fetchVenueBookings(workspaceId?: string): Promise<VenueBooking[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.venueBookings.list(resolvedWorkspaceId);
}

export async function fetchVenueBookingById(id: string, workspaceId?: string): Promise<VenueBooking | undefined> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return (await moc.venueBookings.getById(id, resolvedWorkspaceId)) ?? undefined;
}
